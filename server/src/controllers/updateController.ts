import { Request, Response } from 'express';
import { exec } from 'child_process';
import fs from 'fs';

export const triggerUpdate = (req: Request, res: Response) => {
  const projectRoot = '/app/host_source';
  const logPath = '/app/db_data/update.log';

  console.log('Update triggered. Initializing O.T.A update process...');

  // 1. CLEAR the log file so stale 'update done' entries don't confuse the frontend
  fs.writeFileSync(logPath, `=== Update started at ${new Date().toISOString()} ===\n`);

  // 2. Send immediate response to client
  res.json({
    message: 'Processo de atualização iniciado. O servidor será reiniciado em instantes.',
    status: 'updating'
  });

  // 3. Schedule the update in background, fully detached
  setTimeout(() => {
    // KEY FIX: rebuild ONLY the 'client' container (Nginx/React).
    // Rebuilding the 'server' container would kill this very script (same cgroup).
    // Server-side TypeScript changes require a manual `docker compose up -d --build server`
    // run from the host — they cannot be OTA-applied from within the container itself.
    const updateScript = `
#!/bin/sh
LOG="${logPath}"
echo "--- git pull start ---" >> "$LOG" 2>&1
git config --global --add safe.directory "${projectRoot}" >> "$LOG" 2>&1
cd "${projectRoot}" || { echo "ERROR: cd failed" >> "$LOG" 2>&1; exit 1; }
git pull >> "$LOG" 2>&1
echo "--- git pull done ---" >> "$LOG" 2>&1

echo "--- rebuilding client container ---" >> "$LOG" 2>&1
(docker compose up -d --build client >> "$LOG" 2>&1 \\
  || docker-compose up -d --build client >> "$LOG" 2>&1)

echo "--- update done at $(date) ---" >> "$LOG" 2>&1
`.trim();

    const scriptPath = '/app/db_data/do_update.sh';
    fs.writeFileSync(scriptPath, updateScript, { mode: 0o755 });

    // setsid detaches from the controlling terminal; child.unref() detaches from Node event loop
    const child = exec(`setsid sh ${scriptPath} </dev/null >>/dev/null 2>&1 &`);
    child.unref();

    console.log('Update script dispatched (client-only rebuild). Log:', logPath);
  }, 500);
};

export const checkUpdateStatus = (req: Request, res: Response) => {
  const logPath = '/app/db_data/update.log';
  try {
    if (fs.existsSync(logPath)) {
      const log = fs.readFileSync(logPath, 'utf8');
      const lines = log.split('\n').slice(-30).join('\n'); // last 30 lines
      const isDone = log.includes('update done at');
      const hasError = log.includes('ERROR:') || log.includes('error:') || log.includes('failed');
      res.json({ status: isDone ? 'done' : 'updating', log: lines, hasError });
    } else {
      res.json({ status: 'idle', log: '', hasError: false });
    }
  } catch {
    res.json({ status: 'idle', log: '', hasError: false });
  }
};
