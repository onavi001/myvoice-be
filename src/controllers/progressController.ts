import { Request, Response } from 'express';
import { sendError, sendSuccess } from '../utils/apiResponse';
import { progressSchema, progressUpdateSchema } from '../validators/progressValidators';
import {
  clearProgressService,
  createProgressService,
  deleteProgressService,
  listProgressService,
  updateProgressService,
} from '../services/progressService';

// GET /api/progress - Listar progreso del usuario
export const listProgress = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const { routineId, startDate, endDate } = req.query;
    const result = await listProgressService(userId, {
      routineId: routineId ? String(routineId) : undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
    });
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Progreso obtenido correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al obtener progreso');
  }
};

// POST /api/progress - Crear progreso
export const createProgress = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const parsed = progressSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'Datos de progreso inválidos', parsed.error.issues);
    }
    const result = await createProgressService(userId, parsed.data);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 201, 'Progreso creado correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al crear progreso');
  }
};

// PUT /api/progress/:id - Actualizar progreso
export const updateProgress = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { id } = req.params;
  try {
    const parsed = progressUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'Datos de progreso inválidos', parsed.error.issues);
    }
    const result = await updateProgressService(userId, id, parsed.data);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Progreso actualizado correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al actualizar el progreso');
  }
};

// DELETE /api/progress/:id - Eliminar progreso
export const deleteProgress = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { id } = req.params;
  try {
    const result = await deleteProgressService(userId, id);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Progreso eliminado correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al eliminar el progreso');
  }
};

// DELETE /api/progress - Eliminar todo el progreso del usuario
export const clearProgress = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const result = await clearProgressService(userId);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Progreso eliminado correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al limpiar progreso');
  }
};
