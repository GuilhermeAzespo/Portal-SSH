import { Request, Response } from 'express';
import { exec } from 'child_process';
import fs from 'fs';

export const triggerUpdate = (req: Request, res: Response) => {
  const projectRoot = '/app/host_source';
  const logPath = '/app/db_data/update.log';

  console.log('Update triggered. Initializing O.T.A update process...');

  // Clear the log so stale 'update done' entries don't confuse the frontend
  fs.writeFileSync(logPath, `=== Update started at ${new Date().toISOString()} ===\n`);

  // Send immediate response to client
  res.json({
    message: 'Processo de atualização iniciado. O servidor será reiniciado em instantes.',
    status: 'updating'
  });

  // Schedule the update in background, fully detached
  setTimeout(() => {
    const updateScript = `
#!/bin/sh
LOG="${logPath}"

echo "--- git pull start ---" >> "$LOG" 2>&1
git config --global --add safe.directory "${projectRoot}" >> "$LOG" 2>&1
cd "${projectRoot}" || { echo "ERROR: cd failed" >> "$LOG" 2>&1; exit 1; }
git pull >> "$LOG" 2>&1
echo "--- git pull done ---" >> "$LOG" 2>&1

echo "--- rebuilding portal-ssh-client container ---" >> "$LOG" 2>&1
# -p portal-ssh   -> correct project name (avoids creating host_source-* containers)
# build --no-cache -> forces fresh build even if source files unchanged on disk
# up --no-deps    -> CRITICAL: do NOT touch the server container.
#   Without this flag, Docker Compose resolves '.' in the volume mount as /app/host_source
#   (container path) instead of /home/gui/Portal-SSH (host path), detecting a config
#   difference and recreating the server, which then fails with SIGTERM.
docker compose -p portal-ssh build --no-cache client >> "$LOG" 2>&1
docker compose -p portal-ssh up -d --no-deps client >> "$LOG" 2>&1

echo "--- update done at $(date) ---" >> "$LOG" 2>&1
`.trim();

    const scriptPath = '/app/db_data/do_update.sh';
    fs.writeFileSync(scriptPath, updateScript, { mode: 0o755 });

    const child = exec(`setsid sh ${scriptPath} </dev/null >>/dev/null 2>&1 &`);
    child.unref();

    console.log('Update script dispatched (--no-deps, portal-ssh). Log:', logPath);
  }, 500);
};

export const checkUpdateStatus = (req: Request, res: Response) => {
  const logPath = '/app/db_data/update.log';
  try {
    if (fs.existsSync(logPath)) {
      const log = fs.readFileSync(logPath, 'utf8');
      const lines = log.split('\n').slice(-30).join('\n');
      const isDone = log.includes('update done at');
      const hasError = log.includes('ERROR:') || log.includes('error:');
      res.json({ status: isDone ? 'done' : 'updating', log: lines, hasError });
    } else {
      res.json({ status: 'idle', log: '', hasError: false });
    }
  } catch {
    res.json({ status: 'idle', log: '', hasError: false });
  }
};
