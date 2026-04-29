import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Day from '../models/Day';
import Exercise from '../models/Exercise';
import Routine from '../models/Routine';
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

// DELETE /api/days/:id - Eliminar día
export const deleteDay = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { id } = req.params;
  try {
    const day = await Day.findById(id).lean();
    if (!day) return res.status(404).json({ message: 'Día no encontrado' });
    const exerciseIds = (day.exercises || []).map((exerciseId) => exerciseId.toString());
    if (exerciseIds.length > 0) {
      await Exercise.deleteMany({ _id: { $in: exerciseIds } });
    }
    await Day.findByIdAndDelete(id);
    await Routine.updateMany({ days: id }, { $pull: { days: id } });
    res.status(200).json({ message: 'Día eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar día', error });
  }
};

// PUT /api/days/:id/reset - Reiniciar progreso de ejercicios del día
export const resetDayProgress = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { id } = req.params;
  try {
    const day = await Day.findById(id).lean();
    if (!day) return res.status(404).json({ message: 'Día no encontrado' });
    const exerciseIds = (day.exercises || []).map((exerciseId) => exerciseId.toString());
    if (exerciseIds.length > 0) {
      await Exercise.updateMany({ _id: { $in: exerciseIds } }, { $set: { completed: false } });
    }
    res.status(200).json({ message: 'Progreso del día reiniciado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al reiniciar día', error });
  }
};

// POST /api/days/:id/exercises - Crear ejercicio en día
export const addExerciseToDay = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { id } = req.params;
  try {
    const day = await Day.findById(id);
    if (!day) return res.status(404).json({ message: 'Día no encontrado' });
    const exercise = await Exercise.create(req.body);
    day.set('exercises', [...(day.exercises as unknown as mongoose.Types.ObjectId[]), exercise._id as mongoose.Types.ObjectId]);
    await day.save();
    res.status(201).json(exercise);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear ejercicio', error });
  }
};
