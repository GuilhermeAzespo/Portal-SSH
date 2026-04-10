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
    // We try 'docker compose' first (modern), then 'docker-compose' (legacy)
    const updateCommand = `cd ${projectRoot} && git pull && (docker compose up -d --build || docker-compose up -d --build)`;
    
    exec(updateCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Update Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`Update Output (stderr): ${stderr}`);
      }
      console.log(`Update Output (stdout): ${stdout}`);
      console.log('Update process completed. Service should have restarted.');
    });
  }, 2000);
};

export const checkUpdateStatus = (req: Request, res: Response) => {
  // This is a simple placeholder. 
  // In a more complex setup, we could track progress in a file or DB.
  res.json({ status: 'idle' });
};
