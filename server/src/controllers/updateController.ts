import { Request, Response } from 'express';
import { exec } from 'child_process';
import fs from 'fs';

export const triggerUpdate = (req: Request, res: Response) => {
  const projectRoot = '/app/host_source';
  const logPath = '/app/db_data/update.log';

  console.log('Update triggered. Initializing O.T.A update process...');

  // 1. CLEAR the log file so stale 'update done' entries don't confuse the frontend
  const startLine = `=== Update started at ${new Date().toISOString()} ===\n`;
  fs.writeFileSync(logPath, startLine);

  // 2. Send immediate response to client before anything else
  res.json({
    message: 'Processo de atualização iniciado. O servidor será reiniciado em instantes.',
    status: 'updating'
  });

  // 3. Schedule the update in background, fully detached from this process
  setTimeout(() => {
    const updateScript = `
#!/bin/sh
echo "--- git pull start ---" >> ${logPath} 2>&1
git config --global --add safe.directory ${projectRoot} >> ${logPath} 2>&1
cd ${projectRoot} >> ${logPath} 2>&1
git pull >> ${logPath} 2>&1
echo "--- docker rebuild start ---" >> ${logPath} 2>&1
(docker compose up -d --build >> ${logPath} 2>&1 || docker-compose up -d --build >> ${logPath} 2>&1)
echo "--- update done at $(date) ---" >> ${logPath} 2>&1
`.trim();

    const scriptPath = '/app/db_data/do_update.sh';
    fs.writeFileSync(scriptPath, updateScript, { mode: 0o755 });

    // Execute fully detached — setsid creates a new session so killing Node won't kill this
    const child = exec(`setsid sh ${scriptPath} </dev/null >>/dev/null 2>&1 &`);
    child.unref();

    console.log('Update script dispatched (detached). Check logs at:', logPath);
  }, 500);
};


export const checkUpdateStatus = (req: Request, res: Response) => {
  const logPath = '/app/db_data/update.log';
  try {
    if (require('fs').existsSync(logPath)) {
      const log = require('fs').readFileSync(logPath, 'utf8');
      const lines = log.split('\n').slice(-20).join('\n'); // Last 20 lines
      const isDone = log.includes('update done at');
      const hasError = log.includes('error') || log.includes('Error');
      res.json({ status: isDone ? 'done' : 'updating', log: lines, hasError });
    } else {
      res.json({ status: 'idle', log: '', hasError: false });
    }
  } catch {
    res.json({ status: 'idle', log: '', hasError: false });
  }
};
