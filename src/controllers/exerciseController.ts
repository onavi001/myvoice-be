import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Exercise from '../models/Exercise';
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

// DELETE /api/exercises/:id - Eliminar ejercicio
export const deleteExercise = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { id } = req.params;
  try {
    const deleted = await Exercise.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Ejercicio no encontrado' });
    await Day.updateMany({ exercises: id }, { $pull: { exercises: id } });
    res.status(200).json({ message: 'Ejercicio eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar ejercicio', error });
  }
};

// POST /api/exercises/generate - Sugerir ejercicios alternativos
export const generateExercises = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  try {
    const suggestions = [
      { name: 'Sentadilla Goblet', sets: 3, reps: 12, repsUnit: 'count', weightUnit: 'kg', weight: 0, rest: '60', tips: ['Controla el descenso'], muscleGroup: ['Piernas'] },
      { name: 'Press de hombro mancuernas', sets: 3, reps: 10, repsUnit: 'count', weightUnit: 'kg', weight: 0, rest: '60', tips: ['No arquees la espalda'], muscleGroup: ['Hombros'] },
      { name: 'Plancha frontal', sets: 3, reps: 30, repsUnit: 'seconds', weightUnit: 'kg', weight: 0, rest: '45', tips: ['Mantén el core activo'], muscleGroup: ['Core'] },
    ];
    res.status(200).json(suggestions);
  } catch (error) {
    res.status(500).json({ message: 'Error al generar ejercicios', error });
  }
};
