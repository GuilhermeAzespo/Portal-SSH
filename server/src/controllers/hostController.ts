import { Request, Response } from 'express';
import { db } from '../db/database';

export const getHosts = (req: Request, res: Response) => {
  db.all('SELECT id, name, host, port, username FROM hosts', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ hosts: rows });
  });
};

export const createHost = (req: Request, res: Response) => {
  const { name, host, port, username, password, privateKey } = req.body;
  
  if (!name || !host || !username) {
    return res.status(400).json({ error: 'Name, host and username are required' });
  }

  const stmt = db.prepare(`INSERT INTO hosts (name, host, port, username, password, privateKey) VALUES (?, ?, ?, ?, ?, ?)`);
  stmt.run([name, host, port || 22, username, password || null, privateKey || null], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Host created successfully', id: this.lastID });
  });
};

export const updateHost = (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, host, port, username, password, privateKey } = req.body;
  
  if (!name || !host || !username) {
    return res.status(400).json({ error: 'Name, host and username are required' });
  }

  let query = `UPDATE hosts SET name = ?, host = ?, port = ?, username = ?`;
  const params: any[] = [name, host, port || 22, username];

  if (password) {
    query += `, password = ?`;
    params.push(password);
  }
  if (privateKey) {
    query += `, privateKey = ?`;
    params.push(privateKey);
  }
  
  query += ` WHERE id = ?`;
  params.push(id);

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) return res.status(404).json({ error: 'Host not found' });
    res.json({ message: 'Host updated successfully' });
  });
};

export const deleteHost = (req: Request, res: Response) => {
  const { id } = req.params;
  db.run(`DELETE FROM hosts WHERE id = ?`, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Host deleted' });
  });
};
