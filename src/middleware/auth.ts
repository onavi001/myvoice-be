import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/Users';
import { JWT_SECRET } from '../config';

type JwtPayload = {
  userId: string;
  email: string;
};

function extractToken(req: Request): string | null {
  return req.headers.authorization?.split(' ')[1] || null;
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ message: 'No autenticado' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

export const requireRole = (...roles: Array<'admin' | 'coach' | 'user'>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.userId) return res.status(401).json({ message: 'No autenticado' });
    const user = await User.findById(req.userId).select('role').lean();
    if (!user) return res.status(401).json({ message: 'Usuario no encontrado' });
    if (!roles.includes(user.role as 'admin' | 'coach' | 'user')) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    req.userRole = user.role;
    next();
  };

