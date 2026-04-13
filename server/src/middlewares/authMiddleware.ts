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

  jwt.verify(token, process.env.JWT_SECRET || 'portal-ssh-secret-dev', (err: any, decoded: any) => {
    if (err) return res.status(403).json({ message: 'Token inválido ou expirado.' });

    // Fetch full user data including role permissions
    // Corrected SQL: removed '切实' typo and ensured SELECT is used.
    const query = `
      SELECT u.*, r.name as roleName, r.permissions 
      FROM users u 
      LEFT JOIN roles r ON u.roleId = r.id 
      WHERE u.id = ?
    `;

    db.get(query, [decoded.id], (err, dbUser: any) => {
      if (err || !dbUser) {
        // Fallback to token data if DB fetch fails
        req.user = decoded;
        return next();
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
          role: dbUser.roleName || dbUser.role || decoded.role // Robust role assignment
        };
        next();
      }
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
    
    // Admin always has all permissions
    const hasPermission = req.user.roleName === 'Administrador' || 
                         req.user.role === 'admin' || 
                         (req.user.permissions && req.user.permissions.includes(permission));

    if (!hasPermission) {
      return res.status(403).json({ message: `Acesso negado. Permissão necessária: ${permission}` });
    }
    next();
  };
};
