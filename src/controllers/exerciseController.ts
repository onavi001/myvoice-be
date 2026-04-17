import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Exercise from '../models/Exercise';

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

// PUT /api/exercises/:id - Actualizar ejercicio
export const updateExercise = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { id } = req.params;
  try {
    const updateData = req.body;
    const exercise = await Exercise.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('videos').lean();
    if (!exercise) return res.status(404).json({ message: 'Ejercicio no encontrado' });
    res.status(200).json(exercise);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar ejercicio', error });
  }
};
