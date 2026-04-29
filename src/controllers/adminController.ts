import { Request, Response } from 'express';
import { sendError, sendSuccess } from '../utils/apiResponse';
import {
  approveCoachRequestService,
  createCoachRequestService,
  getUserCoachRequestService,
  listCoachRequestsService,
  listUsersService,
  rejectCoachRequestService,
  updateUserService,
} from '../services/adminService';

// GET /api/admin/users - Listar usuarios (solo admin)
export const listUsers = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const result = await listUsersService(userId);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Usuarios obtenidos correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al obtener usuarios');
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { id } = req.params;
  try {
    const result = await updateUserService(userId, id, req.body);
    if (!result.ok) return sendError(res, result.status, result.message, result.details);
    return sendSuccess(res, 200, 'Usuario actualizado correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al actualizar usuario');
  }
};

// GET /api/admin/user - Solicitud de coach del usuario autenticado
export const getUserCoachRequest = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const result = await getUserCoachRequestService(userId);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Solicitud obtenida correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al obtener solicitud');
  }
};

// GET /api/admin/coach-requests - Listar solicitudes de coach a admin
export const listCoachRequests = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const result = await listCoachRequestsService(userId);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Solicitudes obtenidas correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al obtener solicitudes');
  }
};

// POST /api/admin/coach-requests - Crear solicitud para ser coach
export const createCoachRequest = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const { message } = req.body;
    const result = await createCoachRequestService(userId, message);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 201, 'Solicitud creada correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al crear solicitud');
  }
};

// POST /api/admin/coach-requests/:requestId/approve - Aprobar solicitud de coach
export const approveCoachRequest = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { requestId } = req.params;
  try {
    const result = await approveCoachRequestService(userId, requestId);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Solicitud aprobada correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al aprobar solicitud');
  }
};

// POST /api/admin/coach-requests/:requestId/reject - Rechazar solicitud de coach
export const rejectCoachRequest = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { requestId } = req.params;
  try {
    const result = await rejectCoachRequestService(userId, requestId);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Solicitud rechazada correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al rechazar solicitud');
  }
};
