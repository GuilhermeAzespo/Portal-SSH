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
  const logPath = '/app/db_data/update.log';
  const triggerPath = '/app/db_data/update.trigger';

  console.log('Update triggered. Delegating to Updater module...');

  // Set the trigger and wait for the standalone updater to pick it up
  fs.writeFileSync(triggerPath, 'execute', { mode: 0o777 });
  fs.writeFileSync(logPath, `=== Update Triggered at ${new Date().toISOString()} ===\nAguardando módulo updater capturar a ordem...\n`);

  // Log to standard output as well
  console.log('Trigger written to:', triggerPath);

  res.json({
    message: 'Ordem de atualização enviada ao Updater autônomo. O sistema vai recarregar em alguns instantes.',
    status: 'updating'
  });
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
