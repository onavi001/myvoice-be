import { Request, Response } from 'express';
import { sendError, sendSuccess } from '../utils/apiResponse';
import { addExerciseToDayService, deleteDayService, resetDayProgressService, updateDayService } from '../services/dayService';

// PUT /api/days/:id - Actualizar día
export const updateDay = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { id } = req.params;
  try {
    const { dayName } = req.body;
    const result = await updateDayService(userId, id, dayName);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Día actualizado correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al actualizar día');
  }
};

// DELETE /api/days/:id - Eliminar día
export const deleteDay = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { id } = req.params;
  try {
    const result = await deleteDayService(userId, id);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Día eliminado correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al eliminar día');
  }
};

// PUT /api/days/:id/reset - Reiniciar progreso de ejercicios del día
export const resetDayProgress = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { id } = req.params;
  try {
    const result = await resetDayProgressService(userId, id);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Progreso del día reiniciado', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al reiniciar día');
  }
};

// POST /api/days/:id/exercises - Crear ejercicio en día
export const addExerciseToDay = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { id } = req.params;
  try {
    const result = await addExerciseToDayService(userId, id, req.body);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 201, 'Ejercicio creado correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al crear ejercicio');
  }
};
