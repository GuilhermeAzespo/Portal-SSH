import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db/database';

export const getUsers = (req: Request, res: Response) => {
  const query = `
    SELECT u.id, u.username, u.email, u.firstName, u.lastName, u.role, u.roleId, r.name as roleName,
    (SELECT GROUP_CONCAT(sectorId) FROM user_sectors WHERE userId = u.id) as sectorIds
    FROM users u
    LEFT JOIN roles r ON u.roleId = r.id
  `;
  db.all(query, [], (err, rows: any) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const users = rows.map((u: any) => ({
      ...u,
      sectorIds: u.sectorIds ? u.sectorIds.split(',').map(Number) : []
    }));
    res.json({ users });
  });
};

export const createUser = async (req: Request, res: Response) => {
  const { username, email, password, firstName, lastName, role, roleId, sectorIds } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare(`INSERT INTO users (username, email, password, firstName, lastName, role, roleId) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    
    stmt.run([username, email, hashedPassword, firstName || null, lastName || null, role || 'user', roleId || null], function(err: any) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username or Email already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      
      const newUserId = this.lastID;

      // Assign sectors
      if (sectorIds && Array.isArray(sectorIds)) {
        const sectorStmt = db.prepare(`INSERT INTO user_sectors (userId, sectorId) VALUES (?, ?)`);
        sectorIds.forEach(sid => sectorStmt.run(newUserId, sid));
        sectorStmt.finalize();
      }

      res.json({ message: 'User created successfully', id: newUserId });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error encrypting password' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { username, email, password, firstName, lastName, role, roleId, sectorIds } = req.body;
  
  if (!username || !email) {
    return res.status(400).json({ error: 'Username and email are required' });
  }

  try {
    let query = `UPDATE users SET username = ?, email = ?, firstName = ?, lastName = ?, role = ?, roleId = ?`;
    const params: any[] = [username, email, firstName || null, lastName || null, role || 'user', roleId || null];

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

      // Sync sectors: Delete old and insert new
      // NOTE: res.json is called INSIDE the callback to ensure sectors are committed before responding
      db.run(`DELETE FROM user_sectors WHERE userId = ?`, [Number(id)], (delErr) => {
        if (delErr) {
          console.error('[userController] Failed to delete old sectors:', delErr);
        }
        if (sectorIds && Array.isArray(sectorIds) && sectorIds.length > 0) {
          const sectorStmt = db.prepare(`INSERT OR IGNORE INTO user_sectors (userId, sectorId) VALUES (?, ?)`);
          sectorIds.forEach(sid => sectorStmt.run(Number(id), Number(sid)));
          sectorStmt.finalize(() => {
            res.json({ message: 'User updated successfully' });
          });
        } else {
          res.json({ message: 'User updated successfully' });
        }
      });
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

    if (userToDelete.role === 'admin' || userToDelete.role === 'Administrador') {
      db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'admin' OR role = 'Administrador'`, [], (err, row: any) => {
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
