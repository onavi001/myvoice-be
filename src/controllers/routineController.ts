import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Routine from '../models/Routine';
import Day from '../models/Day';
import Exercise from '../models/Exercise';
import User from '../models/Users';

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

// GET /api/routines - Listar rutinas del usuario o coach
export const listRoutines = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  try {
    const user = await User.findById(userId).lean();
    const query: Record<string, unknown> = { name: { $ne: null }, 'days.0': { $exists: true } };
    if (user && user.role === 'coach') {
      query.$or = [{ userId }, { coachId: userId }];
    } else {
      query.userId = userId;
    }
    const routines = await Routine.find(query)
      .populate({ path: 'days', populate: { path: 'exercises', populate: { path: 'videos' } } })
      .lean();
    res.status(200).json(routines);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener rutinas', error });
  }
};

// GET /api/routines/:routineId - Obtener rutina por ID
export const getRoutine = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { routineId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(routineId)) {
    return res.status(400).json({ message: 'ID de rutina inválido' });
  }
  try {
    const routine = await Routine.findById(routineId)
      .populate({ path: 'days', populate: { path: 'exercises', populate: 'videos' } });
    if (!routine) return res.status(404).json({ message: 'Rutina no encontrada' });
    res.status(200).json(routine);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener rutina', error });
  }
};

// PUT /api/routines/:routineId - Actualizar rutina
export const updateRoutine = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { routineId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(routineId)) {
    return res.status(400).json({ message: 'ID de rutina inválido' });
  }
  try {
    const { routineData } = req.body;
    if (!routineData || !Array.isArray(routineData.days)) {
      return res.status(400).json({ message: 'Datos de rutina inválidos' });
    }
    // Aquí puedes actualizar los días, ejercicios, etc. según la lógica de tu app
    // ...
    res.status(200).json({ message: 'Rutina actualizada (implementación pendiente)' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar rutina', error });
  }
};

// POST /api/routines/:routineId/days - Agregar día a rutina
export const addDayToRoutine = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { routineId } = req.params;
  try {
    const { dayName, musclesWorked, warmupOptions, explanation, exercises } = req.body;
    const exerciseIds = [];
    for (const exData of exercises || []) {
      const exercise = new Exercise(exData);
      await exercise.save();
      exerciseIds.push(exercise._id);
    }
    const day = new Day({ dayName, musclesWorked, warmupOptions, explanation, exercises: exerciseIds });
    await day.save();
    await Routine.findByIdAndUpdate(routineId, { $push: { days: day._id } });
    res.status(201).json(day);
  } catch (error) {
    res.status(500).json({ message: 'Error al agregar día', error });
  }
};
