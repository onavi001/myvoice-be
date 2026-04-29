import { Request, Response } from 'express';
import { sendError, sendSuccess } from '../utils/apiResponse';
import {
  createVideoService,
  deleteVideoService,
  searchVideosService,
  updateVideoService,
} from '../services/videoService';

// GET /api/videos?exerciseName=... - Buscar videos de YouTube
export const searchVideos = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const { exerciseName } = req.query;
    if (!exerciseName) return sendError(res, 400, 'Faltan parámetros requeridos');
    const result = await searchVideosService(String(exerciseName));
    if (!result.ok) return sendError(res, result.status, result.message, result.details);
    return sendSuccess(res, 200, 'Videos obtenidos correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error interno del servidor');
  }
};

// POST /api/videos - Crear video
export const createVideo = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const result = await createVideoService(req.body);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 201, 'Video creado correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al crear video');
  }
};

// PUT /api/videos/:id - Actualizar video
export const updateVideo = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { id } = req.params;
  try {
    const result = await updateVideoService(id, req.body);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Video actualizado correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al actualizar video');
  }
};

// DELETE /api/videos/:id - Eliminar video
export const deleteVideo = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { id } = req.params;
  try {
    const result = await deleteVideoService(id);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Video eliminado correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al eliminar video');
  }
};
