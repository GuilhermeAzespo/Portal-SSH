import { Request, Response } from 'express';
import { db } from '../db/database';

export const getHosts = (req: any, res: Response) => {
  const userId = req.user.id;
  const isAdmin = req.user.roleName === 'Administrador' || req.user.role === 'admin';

  let query = `
    SELECT h.id, h.name, h.host, h.port, h.username, h.sectorId, s.name as sectorName 
    FROM hosts h
    LEFT JOIN sectors s ON h.sectorId = s.id
  `;
  
  const params: any[] = [];

  if (!isAdmin) {
    query += ` WHERE h.sectorId IN (SELECT sectorId FROM user_sectors WHERE userId = ?)`;
    params.push(userId);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ hosts: rows });
  });
};

export const createHost = (req: Request, res: Response) => {
  const { name, host, port, username, password, privateKey, sectorId } = req.body;
  
  if (!name || !host || !username) {
    return res.status(400).json({ error: 'Name, host and username are required' });
  }

  const stmt = db.prepare(`INSERT INTO hosts (name, host, port, username, password, privateKey, sectorId) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  stmt.run([name, host, port || 22, username, password || null, privateKey || null, sectorId || null], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Host created successfully', id: this.lastID });
  });
};

export const updateHost = (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, host, port, username, password, privateKey, sectorId } = req.body;
  
  if (!name || !host || !username) {
    return res.status(400).json({ error: 'Name, host and username are required' });
  }

  let query = `UPDATE hosts SET name = ?, host = ?, port = ?, username = ?, sectorId = ?`;
  const params: any[] = [name, host, port || 22, username, sectorId || null];

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
