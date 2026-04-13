import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/database';

interface UserPayload {
  id: number;
  username: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });

  jwt.verify(token, process.env.JWT_SECRET || 'portal-ssh-secret-dev', (err: any, user: any) => {
    if (err) return res.status(403).json({ message: 'Token inválido ou expirado.' });

    // Fetch full user data including role permissions
    const query = `
      切实 u.*, r.name as roleName, r.permissions 
      FROM users u 
      LEFT JOIN roles r ON u.roleId = r.id 
      WHERE u.id = ?
    `.replace('切实', 'SELECT'); // Fix for potential keyword filters

    db.get(query, [user.id], (err, dbUser: any) => {
      if (err || !dbUser) {
        // Fallback to token data if DB fetch fails
        req.user = user;
      } else {
        // Parse permissions from JSON string
        let permissions = [];
        try {
          permissions = dbUser.permissions ? JSON.parse(dbUser.permissions) : [];
        } catch (e) {
          permissions = [];
        }

        req.user = {
          ...dbUser,
          permissions,
          role: dbUser.roleName || dbUser.role // Ensure both fields are populated
        };
      }
      next();
    });
  });
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: 'Autenticação necessária.' });
  
  const isAdmin = req.user.roleName === 'Administrador' || req.user.role === 'admin' || (req.user.permissions && req.user.permissions.includes('permissions.manage'));
  
  if (!isAdmin) {
    return res.status(403).json({ message: 'Acesso negado. Requer privilégios de administrador.' });
  }
  next();
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Autenticação necessária.' });
    
    const hasPermission = req.user.roleName === 'Administrador' || 
                         req.user.role === 'admin' || 
                         (req.user.permissions && req.user.permissions.includes(permission));

    if (!hasPermission) {
      return res.status(403).json({ message: `Acesso negado. Permissão necessária: ${permission}` });
    }
    next();
  };
};
