import { Request, Response } from 'express';
import { sendError, sendSuccess } from '../utils/apiResponse';
import {
  acceptCoachRequestService,
  assignClientRoutineService,
  getClientProfileService,
  getCoachByCodeService,
  getCoachProfileService,
  getCoachRequestsService,
  listClientRoutinesService,
  listClientsService,
  listClientProgressService,
  getMyCoachOverviewService,
  listCoachesService,
  markAssignmentSeenService,
  rejectCoachRequestService,
  requestCoachByCodeService,
  requestCoachService,
  updateClientProfileService,
  leaveCoachService,
  removeClientService,
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

// GET /api/coaches/code/:code - Vista previa del coach por código (público)
export const getCoachByCode = async (req: Request, res: Response) => {
  const { code } = req.params;
  try {
    const result = await getCoachByCodeService(code);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Coach encontrado', result.data);
  } catch {
    return sendError(res, 500, 'Error al buscar coach');
  }
};

// GET /api/coaches/my-coach - Estado del coach para el usuario (cliente)
export const getMyCoachOverview = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const result = await getMyCoachOverviewService(userId);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Estado de coach', result.data);
  } catch {
    return sendError(res, 500, 'Error al obtener tu coach');
  }
};

// POST /api/coaches/join - Usuario solicita coach por código
export const requestCoachByCode = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const { code } = req.body;
    const result = await requestCoachByCodeService(userId, String(code ?? ''));
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 201, 'Solicitud enviada', result.data);
  } catch {
    return sendError(res, 500, 'Error al enviar solicitud');
  }
};

// GET /api/coaches/profile - Perfil del coach autenticado (código, límites)
export const getCoachProfile = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const result = await getCoachProfileService(userId);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Perfil de coach', result.data);
  } catch {
    return sendError(res, 500, 'Error al obtener perfil de coach');
  }
};

// POST /api/coaches/assignments/:routineId/seen - Cliente marca rutina asignada como vista
export const markAssignmentSeen = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { routineId } = req.params;
  try {
    const result = await markAssignmentSeenService(userId, routineId);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Asignación marcada como vista', result.data);
  } catch {
    return sendError(res, 500, 'Error al marcar asignación');
  }
};

// POST /api/coaches/leave - Cliente deja a su coach o cancela solicitud pendiente
export const leaveCoach = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const result = await leaveCoachService(userId);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Desvinculación completada', result.data);
  } catch {
    return sendError(res, 500, 'Error al dejar al coach');
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

// GET /api/clients/:clientId/progress - Progreso del cliente (solo coach asignado)
export const listClientProgress = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { clientId } = req.params;
  const { routineId, startDate, endDate } = req.query;
  try {
    const result = await listClientProgressService(userId, clientId, {
      routineId: routineId ? String(routineId) : undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
    });
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Progreso del cliente obtenido correctamente', result.data);
  } catch {
    return sendError(res, 500, 'Error al obtener progreso del cliente');
  }
};

// POST /api/clients/:clientId/routines - Asignar rutina existente al cliente
export const assignClientRoutine = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { clientId } = req.params;
  const { routineId, message, name } = req.body;
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!routineId) return sendError(res, 400, 'routineId es obligatorio');
  if (!trimmedName) return sendError(res, 400, 'El nombre de la rutina es obligatorio');
  try {
    const result = await assignClientRoutineService(userId, clientId, routineId, trimmedName, message);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 201, 'Rutina asignada correctamente', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error al asignar rutina');
  }
};

// DELETE /api/clients/:clientId - Coach elimina cliente de su lista
export const removeClient = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { clientId } = req.params;
  try {
    const result = await removeClientService(userId, clientId);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Cliente eliminado correctamente', result.data);
  } catch {
    return sendError(res, 500, 'Error al eliminar cliente');
  }
};
