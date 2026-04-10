import { Request, Response } from 'express';
import { exec } from 'child_process';
import path from 'path';

export const triggerUpdate = (req: Request, res: Response) => {
  // Use the mounted host source directory
  const projectRoot = '/app/host_source';

  console.log('Update triggered. Initializing O.T.A update process...');

  // 1. Send immediate response to client
  res.json({ 
    message: 'Processo de atualização iniciado. O servidor será reiniciado em instantes.',
    status: 'updating' 
  });

  // 2. Run update script in background
  setTimeout(() => {
    const logPath = '/app/db_data/update.log';
    
    // Commands to run:
    // 1. Setup git safety (crucial for Docker mounted volumes)
    // 2. Pull changes
    // 3. Rebuild and restart (modern or legacy compose)
    // 4. Log everything to a persistent file
    const updateCommand = `(
      echo "--- Update started at $(date) ---" && \
      git config --global --add safe.directory ${projectRoot} && \
      cd ${projectRoot} && \
      git pull && \
      (docker compose up -d --build || docker-compose up -d --build)
    ) >> ${logPath} 2>&1`;
    
    exec(updateCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Update Error (logged to ${logPath}): ${error.message}`);
        return;
      }
      console.log('Update command dispatched successfully.');
    });
  }, 2000);
};

export const checkUpdateStatus = (req: Request, res: Response) => {
  // This is a simple placeholder. 
  // In a more complex setup, we could track progress in a file or DB.
  res.json({ status: 'idle' });
};
