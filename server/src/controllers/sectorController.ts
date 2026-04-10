import { Request, Response } from 'express';
import { db } from '../db/database';

export const getSectors = (req: Request, res: Response) => {
  db.all('SELECT * FROM sectors', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ sectors: rows });
  });
};

export const createSector = (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const stmt = db.prepare('INSERT INTO sectors (name, description) VALUES (?, ?)');
  stmt.run([name, description || null], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Sector created', id: this.lastID });
  });
};

export const updateSector = (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  db.run('UPDATE sectors SET name = ?, description = ? WHERE id = ?', [name, description || null, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Sector updated' });
  });
};

export const deleteSector = (req: Request, res: Response) => {
  const { id } = req.params;
  // Note: Check if hosts are using this sector before deleting? 
  // For now, let's just delete (cascade might be handled by DB or app logic)
  db.run('DELETE FROM sectors WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Sector deleted' });
  });
};
