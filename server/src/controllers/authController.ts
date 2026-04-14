import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db/database';

const JWT_SECRET = process.env.JWT_SECRET || 'portal-ssh-secret-dev';

export const login = (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

    const query = `
      SELECT u.*, r.name as roleName, r.permissions 
      FROM users u 
      LEFT JOIN roles r ON u.roleId = r.id 
      WHERE u.username = ? OR u.email = ?
    `;

    db.get(query, [username, username], async (err, user: any) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const permissions = user.permissions ? JSON.parse(user.permissions) : [];

      // Get user sectors
      db.all("SELECT sectorId FROM user_sectors WHERE userId = ?", [user.id], (err, rows: any) => {
        const sectorIds = rows ? rows.map((r: any) => r.sectorId) : [];

        const token = jwt.sign(
          { 
            id: user.id, 
            username: user.username, 
            role: user.role,
            roleName: user.roleName || user.role,
            sectorIds // Include sectorIds in JWT
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({ 
          token, 
          user: { 
            id: user.id, 
            username: user.username, 
            email: user.email, 
            role: user.role,
            roleName: user.roleName || user.role,
            permissions,
            sectorIds
          } 
        });
      });

    });
};

export const getMe = (req: any, res: Response) => {
  res.json({ user: req.user });
};
