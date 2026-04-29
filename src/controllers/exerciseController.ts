import { Request, Response } from 'express';
import { sendError, sendSuccess } from '../utils/apiResponse';
import { deleteExerciseService, generateExercisesService, updateExerciseService } from '../services/exerciseService';

// PUT /api/exercises/:id - Actualizar ejercicio
export const updateExercise = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { id } = req.params;
  try {
    const result = await updateExerciseService(userId, id, req.body);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Ejercicio actualizado correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al actualizar ejercicio');
  }
};

// DELETE /api/exercises/:id - Eliminar ejercicio
export const deleteExercise = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { id } = req.params;
  try {
    const result = await deleteExerciseService(userId, id);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Ejercicio eliminado correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al eliminar ejercicio');
  }
};

// POST /api/exercises/generate - Sugerir ejercicios alternativos
export const generateExercises = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const result = await generateExercisesService();
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Ejercicios sugeridos correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al generar ejercicios');
  }
};
