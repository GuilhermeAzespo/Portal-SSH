import { Request, Response } from 'express';
import { exec } from 'child_process';
import fs from 'fs';

// Auto-recover from suicide restart
try {
  const initLogPath = '/app/db_data/update.log';
  if (fs.existsSync(initLogPath)) {
    const log = fs.readFileSync(initLogPath, 'utf8');
    if (log.includes('suicide restart initiated') && !log.includes('update done at')) {
       fs.appendFileSync(initLogPath, `\n[${new Date().toISOString()}] --- update done at ${new Date().toISOString()} (recovered from restart) ---\n`);
    }
  }
} catch (e) {
  console.error("Log recovery failed:", e);
}

export const triggerUpdate = (req: Request, res: Response) => {
  const projectRoot = '/app/host_source';
  const logPath = '/app/db_data/update.log';

  console.log('Update triggered. Initializing O.T.A update process...');

  // Clear the log so stale 'update done' entries don't confuse the frontend
  fs.writeFileSync(logPath, `=== Update started at ${new Date().toISOString()} ===\n`);

  // Send immediate response to client
  res.json({
    message: 'Processo de atualização iniciado. O servidor reconstruirá os containers em segundo plano.',
    status: 'updating'
  });

  // Schedule the update in background, fully detached
  setTimeout(() => {
    const updateScript = `
#!/bin/sh
LOG="${logPath}"

log_msg() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG" 2>&1
}

log_msg "--- starting update sequence ---"

# Detect docker compose command
if docker compose version >/dev/null 2>&1; then
  DOCKER_CMD="docker compose"
  log_msg "Detected: 'docker compose'"
elif docker-compose version >/dev/null 2>&1; then
  DOCKER_CMD="docker-compose"
  log_msg "Detected: 'docker-compose'"
else
  log_msg "ERROR: Neither 'docker compose' nor 'docker-compose' found in PATH."
  exit 1
fi

log_msg "--- git pull start ---"
git config --global --add safe.directory "${projectRoot}" >> "$LOG" 2>&1
cd "${projectRoot}" || { log_msg "ERROR: cd to ${projectRoot} failed"; exit 1; }

# Try to pull, capturing common errors
if ! git pull >> "$LOG" 2>&1; then
  log_msg "ERROR: git pull failed. Check internet connection or repository permissions."
  exit 1
fi
log_msg "--- git pull done ---"

log_msg "--- rebuilding containers ---"
# Fix to prevent docker buildx from hanging at 'exporting layers' over mounted socket
export BUILDX_NO_DEFAULT_ATTESTATIONS=1
export DOCKER_BUILDKIT=1

# -p portal-ssh   -> correct project name
# build --no-cache -> forces fresh build
if ! BUILDX_NO_DEFAULT_ATTESTATIONS=1 $DOCKER_CMD -p portal-ssh build client server >> "$LOG" 2>&1; then
  log_msg "ERROR: Docker build failed. Check 'docker logs' for more details."
  exit 1
fi

log_msg "--- restarting services (suicide restart initiated) ---"
if ! $DOCKER_CMD -p portal-ssh up -d client server >> "$LOG" 2>&1; then
  log_msg "ERROR: Docker up failed."
  exit 1
fi

log_msg "--- update done at $(date) ---"
`.trim();

    const scriptPath = '/app/db_data/do_update.sh';
    fs.writeFileSync(scriptPath, updateScript, { mode: 0o755 });

    const child = exec(`setsid sh ${scriptPath} </dev/null >>/dev/null 2>&1 &`);
    child.unref();

    console.log('Update script dispatched. Log:', logPath);
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
