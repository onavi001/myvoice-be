import { Request, Response } from 'express';
import { sendError, sendSuccess } from '../utils/apiResponse';
import { getProfileService, updateProfileService } from '../services/profileService';
import {
  getTrainingProfileService,
  upsertTrainingProfileService,
} from '../services/trainingProfileService';

// Obtener perfil de usuario autenticado
export const getProfile = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const result = await getProfileService(userId);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Perfil obtenido correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al obtener perfil');
  }
};

// Actualizar perfil de usuario autenticado
export const updateProfile = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const result = await updateProfileService(userId, req.body);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Perfil actualizado correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al actualizar perfil');
  }
};

export const getTrainingProfile = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const result = await getTrainingProfileService(userId);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Perfil de entrenamiento obtenido', result.data);
  } catch {
    return sendError(res, 500, 'Error al obtener perfil de entrenamiento');
  }
};

export const updateTrainingProfile = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const result = await upsertTrainingProfileService(userId, req.body);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Perfil de entrenamiento guardado', result.data);
  } catch {
    return sendError(res, 500, 'Error al guardar perfil de entrenamiento');
  }
};
