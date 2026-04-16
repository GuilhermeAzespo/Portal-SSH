import { Request, Response } from 'express';
import { db } from '../db/database';

export const getSettings = (req: Request, res: Response) => {
  db.all("SELECT key, value FROM settings", (err, rows: any[]) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
    const settings: Record<string, string> = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  });
};

export const updateSettings = (req: Request, res: Response) => {
  const { openrouter_key, ai_model } = req.body;

  db.serialize(() => {
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    
    if (openrouter_key !== undefined) {
      stmt.run('openrouter_key', openrouter_key);
    }
    if (ai_model !== undefined) {
      stmt.run('ai_model', ai_model);
    }

    stmt.finalize((err) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao atualizar configurações' });
      }
      res.json({ message: 'Configurações atualizadas com sucesso' });
    });
  });
};
