import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Progress from '../models/Progress';
import mongoose from 'mongoose';

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

// GET /api/progress - Listar progreso del usuario
export const listProgress = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  try {
    const { routineId, startDate, endDate } = req.query;
    const query: Record<string, unknown> = { userId: new mongoose.Types.ObjectId(userId) };
    if (routineId) query.routineId = new mongoose.Types.ObjectId(routineId as string);
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }
    const progress = await Progress.find(query).lean();
    res.status(200).json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener progreso', error });
  }
};

// PUT /api/progress/:id - Actualizar progreso
export const updateProgress = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { id } = req.params;
  try {
    const updatedProgress = await Progress.findOneAndUpdate(
      { _id: id, userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedProgress) return res.status(404).json({ message: 'Progreso no encontrado' });
    res.status(200).json(updatedProgress);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el progreso', error });
  }
};

// DELETE /api/progress/:id - Eliminar progreso
export const deleteProgress = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { id } = req.params;
  try {
    const deletedProgress = await Progress.findOneAndDelete({ _id: id, userId });
    if (!deletedProgress) return res.status(404).json({ message: 'Progreso no encontrado' });
    res.status(200).json({ message: 'Progreso eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el progreso', error });
  }
};
