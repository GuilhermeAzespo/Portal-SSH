import { Request, Response } from 'express';
import { exec } from 'child_process';
import fs from 'fs';

export const triggerUpdate = (req: Request, res: Response) => {
  const projectRoot = '/app/host_source';
  const logPath = '/app/db_data/update.log';

  console.log('Update triggered. Initializing O.T.A update process...');

  // 1. Send immediate response to client before anything else
  res.json({
    message: 'Processo de atualização iniciado. O servidor será reiniciado em instantes.',
    status: 'updating'
  });

  // 2. Schedule the update in background, fully detached from this process
  setTimeout(() => {
    fs.appendFileSync(logPath, `\n--- Update started at ${new Date().toISOString()} ---\n`);

    // Use setsid + nohup to completely detach the update process from Node.js
    // This ensures Docker can kill/restart the server container without interrupting git pull
    // The script:
    //   1. Marks the directory as safe (needed for Docker volume mounts)
    //   2. Pulls latest code from GitHub
    //   3. Rebuilds and restarts ONLY containers that changed (--no-deps avoids cascading restarts)
    //   4. Logs everything to a persistent file in the DB volume
    const updateScript = `
#!/bin/sh
echo "--- git pull start ---" >> ${logPath} 2>&1
git config --global --add safe.directory ${projectRoot} >> ${logPath} 2>&1
cd ${projectRoot} >> ${logPath} 2>&1
git pull >> ${logPath} 2>&1
echo "--- docker rebuild start ---" >> ${logPath} 2>&1
(docker compose up -d --build 2>> ${logPath} || docker-compose up -d --build 2>> ${logPath})
echo "--- update done at $(date) ---" >> ${logPath} 2>&1
`.trim();

    const scriptPath = '/app/db_data/do_update.sh';
    fs.writeFileSync(scriptPath, updateScript, { mode: 0o755 });

    // Execute fully detached — setsid creates a new session so killing Node won't kill this
    const child = exec(`setsid sh ${scriptPath} </dev/null >>${logPath} 2>&1 &`);
    child.unref(); // Detach from Node.js event loop

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
