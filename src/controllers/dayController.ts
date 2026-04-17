import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Day from '../models/Day';

function getUserIdFromRequest(req: Request): string | null {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'my-super-secret-key') as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

// PUT /api/days/:id - Actualizar día
export const updateDay = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { id } = req.params;
  try {
    const { dayName } = req.body;
    const day = await Day.findByIdAndUpdate(id, { dayName }, { new: true }).populate('exercises').lean();
    if (!day) return res.status(404).json({ message: 'Día no encontrado' });
    res.status(200).json(day);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar día', error });
  }
};
