import { Request, Response } from 'express';
import { sendError, sendSuccess } from '../utils/apiResponse';
import {
  acceptCoachRequestService,
  assignClientRoutineService,
  getClientProfileService,
  getCoachRequestsService,
  listClientRoutinesService,
  listClientsService,
  listCoachesService,
  rejectCoachRequestService,
  requestCoachService,
  updateClientProfileService,
} from '../services/coachService';

// GET /api/coaches - Listar coaches
export const listCoaches = async (req: Request, res: Response) => {
  try {
    const result = await listCoachesService();
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Coaches obtenidos correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al obtener los coaches');
  }
};

// POST /api/coaches/requests - Usuario solicita coach
export const requestCoach = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const { id } = req.body;
    const result = await requestCoachService(userId, id);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 201, 'Solicitud enviada', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al enviar solicitud');
  }
};

// GET /api/coaches/requests - Coach ve solicitudes pendientes
export const getCoachRequests = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const result = await getCoachRequestsService(userId);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Solicitudes obtenidas correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al obtener solicitudes');
  }
};

// POST /api/coaches/accept - Coach acepta solicitud
export const acceptCoachRequest = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const { id } = req.body;
    const result = await acceptCoachRequestService(userId, id);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 201, 'Solicitud aceptada correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al aceptar solicitud');
  }
};

// POST /api/coaches/reject - Coach rechaza solicitud
export const rejectCoachRequest = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const { id } = req.body;
    const result = await rejectCoachRequestService(userId, id);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 201, 'Solicitud rechazada correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al rechazar solicitud');
  }
};

// GET /api/clients - Listar clientes asignados al coach autenticado
export const listClients = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const result = await listClientsService(userId);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Clientes obtenidos correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al obtener clientes');
  }
};

// GET /api/clients/:clientId - Obtener perfil de cliente asignado
export const getClientProfile = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { clientId } = req.params;
  try {
    const result = await getClientProfileService(userId, clientId);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Cliente obtenido correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al obtener cliente');
  }
};

// PUT /api/clients/:clientId - Actualizar objetivos/notas del cliente
export const updateClientProfile = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { clientId } = req.params;
  const { goals, notes } = req.body;
  try {
    const result = await updateClientProfileService(userId, clientId, { goals, notes });
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Cliente actualizado correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al actualizar cliente');
  }
};

// GET /api/clients/:clientId/routines - Listar rutinas del cliente
export const listClientRoutines = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { clientId } = req.params;
  try {
    const result = await listClientRoutinesService(userId, clientId);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Rutinas del cliente obtenidas correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al obtener rutinas del cliente');
  }
};

// POST /api/clients/:clientId/routines - Asignar rutina existente al cliente
export const assignClientRoutine = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { clientId } = req.params;
  const { routineId } = req.body;
  try {
    const result = await assignClientRoutineService(userId, clientId, routineId);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 201, 'Rutina asignada correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al asignar rutina');
  }
};
