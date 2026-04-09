import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db/database';

export const getUsers = (req: Request, res: Response) => {
  db.all('SELECT id, username, email, firstName, lastName, role FROM users', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ users: rows });
  });
};

export const createUser = async (req: Request, res: Response) => {
  const { username, email, password, firstName, lastName, role } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare(`INSERT INTO users (username, email, password, firstName, lastName, role) VALUES (?, ?, ?, ?, ?, ?)`);
    
    stmt.run([username, email, hashedPassword, firstName || null, lastName || null, role || 'user'], function(err: any) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username or Email already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'User created successfully', id: this.lastID });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error encrypting password' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { username, email, password, firstName, lastName, role } = req.body;
  
  if (!username || !email) {
    return res.status(400).json({ error: 'Username and email are required' });
  }

  try {
    let query = `UPDATE users SET username = ?, email = ?, firstName = ?, lastName = ?, role = ?`;
    const params: any[] = [username, email, firstName || null, lastName || null, role || 'user'];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += `, password = ?`;
      params.push(hashedPassword);
    }
    
    query += ` WHERE id = ?`;
    params.push(id);

    db.run(query, params, function(err: any) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username or Email already taken' });
        }
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
      res.json({ message: 'User updated successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error processing update' });
  }
};

export const deleteUser = (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Anti-lockout: Prevent deleting the last admin or yourself
  db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, userToDelete: any) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!userToDelete) return res.status(404).json({ error: 'User not found' });

    if (userToDelete.role === 'admin') {
      db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`, [], (err, row: any) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row.count <= 1) {
          return res.status(403).json({ error: 'Cannot delete the only admin user' });
        }
        executeDelete();
      });
    } else {
      executeDelete();
    }
  });

  function executeDelete() {
    db.run(`DELETE FROM users WHERE id = ?`, [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'User deleted' });
    });
  }
};
