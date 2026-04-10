import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/database';

const JWT_SECRET = process.env.JWT_SECRET || 'portal-ssh-secret-dev';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    
    // Fetch full user and permissions from DB
    db.get(
      `SELECT u.*, r.permissions 
       FROM users u 
       LEFT JOIN roles r ON u.roleId = r.id 
       WHERE u.id = ?`, 
      [decoded.id], 
      (dbErr, user: any) => {
        if (dbErr || !user) {
          req.user = decoded; // Fallback to token data
          return next();
        }

        req.user = {
          ...user,
          permissions: user.permissions ? JSON.parse(user.permissions) : []
        };
        next();
      }
    );
  });
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== 'admin' && !req.user.permissions?.includes('permissions.manage'))) {
    return res.status(403).json({ error: 'Privilégios administrativos necessários' });
  }
  next();
};

export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
    
    // Global admin bypass
    if (req.user.role === 'admin' || req.user.permissions?.includes('*')) {
      return next();
    }

    if (req.user.permissions && req.user.permissions.includes(permission)) {
      return next();
    }

    res.status(403).json({ error: `Sem permissão: ${permission}` });
  };
};
