import { Request, Response } from 'express';
import User from '../models/Users';
import CoachRequest from '../models/CoachRequest';
import jwt from 'jsonwebtoken';
import Routine from '../models/Routine';

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

// GET /api/coaches - Listar coaches
export const listCoaches = async (req: Request, res: Response) => {
  try {
    const coaches = await User.find({ role: 'coach' }).select('-password').lean();
    const serializedCoaches = coaches.map((c) => ({
      _id: c._id.toString(),
      username: c.username,
      email: c.email,
      specialties: c.specialties,
      bio: c.bio,
    }));
    res.status(200).json(serializedCoaches);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los coaches', error });
  }
};

// POST /api/coaches/requests - Usuario solicita coach
export const requestCoach = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  try {
    const user = await User.findById(userId).lean();
    const { id } = req.body; // id del coach
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (user.role !== 'user') return res.status(403).json({ message: 'Solo los usuarios pueden solicitar coaches' });
    if (user.coachId) return res.status(400).json({ message: 'Ya tienes un coach asignado' });
    const coach = await User.findById(id);
    if (!coach || coach.role !== 'coach') return res.status(404).json({ message: 'Coach no encontrado' });
    const existingRequest = await CoachRequest.findOne({ userId, status: 'pending' });
    if (existingRequest) return res.status(400).json({ message: 'Ya tienes una solicitud pendiente' });
    const coachRequest = new CoachRequest({ userId, coachId: id, status: 'pending' });
    await coachRequest.save();
    res.status(201).json({ message: 'Solicitud enviada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al enviar solicitud', error });
  }
};

// GET /api/coaches/requests - Coach ve solicitudes pendientes
export const getCoachRequests = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  try {
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (user.role !== 'coach') return res.status(403).json({ message: 'Solo los coaches pueden ver solicitudes' });
    const requests = await CoachRequest.find({ coachId: userId, status: 'pending' })
      .populate('userId', 'username email')
      .lean();
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener solicitudes', error });
  }
};

// POST /api/coaches/accept - Coach acepta solicitud
export const acceptCoachRequest = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  try {
    const coach = await User.findById(userId).lean();
    const { id } = req.body; // id del usuario
    if (!coach) return res.status(404).json({ message: 'Usuario no encontrado' });
    const request = await CoachRequest.findOne({ userId: id, coachId: coach._id, status: 'pending' });
    if (!request) return res.status(404).json({ message: 'Solicitud no encontrada' });
    request.status = 'accepted';
    await request.save();
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    user.coachId = coach._id;
    await user.save();
    // Rechazar otras solicitudes pendientes del usuario
    await CoachRequest.updateMany({ userId: id, status: 'pending', _id: { $ne: request._id } }, { $set: { status: 'rejected' } });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error al aceptar solicitud', error });
  }
};

// POST /api/coaches/reject - Coach rechaza solicitud
export const rejectCoachRequest = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  try {
    const coach = await User.findById(userId).lean();
    const { id } = req.body; // id del usuario
    if (!coach) return res.status(404).json({ message: 'Usuario no encontrado' });
    const request = await CoachRequest.findOne({ userId: id, coachId: coach._id, status: 'pending' });
    if (!request) return res.status(404).json({ message: 'Solicitud no encontrada' });
    request.status = 'rejected';
    await request.save();
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: 'Error al rechazar solicitud', error });
  }
};

// GET /api/clients - Listar clientes asignados al coach autenticado
export const listClients = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  try {
    const clients = await User.find({ coachId: userId }).select('-password').lean();
    res.status(200).json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener clientes', error });
  }
};

// GET /api/clients/:clientId - Obtener perfil de cliente asignado
export const getClientProfile = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { clientId } = req.params;
  try {
    const client = await User.findOne({ _id: clientId, coachId: userId }).select('-password').lean();
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });
    res.status(200).json(client);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener cliente', error });
  }
};

// PUT /api/clients/:clientId - Actualizar objetivos/notas del cliente
export const updateClientProfile = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { clientId } = req.params;
  const { goals, notes } = req.body;
  try {
    const client = await User.findOne({ _id: clientId, coachId: userId });
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });
    if (goals !== undefined) client.goals = goals;
    if (notes !== undefined) client.notes = notes;
    await client.save();
    const serialized = await User.findById(client._id).select('-password').lean();
    res.status(200).json(serialized);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar cliente', error });
  }
};

// GET /api/clients/:clientId/routines - Listar rutinas del cliente
export const listClientRoutines = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { clientId } = req.params;
  try {
    const client = await User.findOne({ _id: clientId, coachId: userId }).lean();
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });
    const routines = await Routine.find({ userId: clientId })
      .populate({ path: 'days', populate: { path: 'exercises', populate: { path: 'videos' } } })
      .lean();
    res.status(200).json(routines);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener rutinas del cliente', error });
  }
};

// POST /api/clients/:clientId/routines - Asignar rutina existente al cliente
export const assignClientRoutine = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { clientId } = req.params;
  const { routineId } = req.body;
  try {
    const client = await User.findOne({ _id: clientId, coachId: userId }).lean();
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });
    const sourceRoutine = await Routine.findById(routineId).lean();
    if (!sourceRoutine) return res.status(404).json({ message: 'Rutina no encontrada' });
    const assignedRoutine = await Routine.create({
      userId: clientId,
      couchId: userId,
      name: sourceRoutine.name,
      days: sourceRoutine.days,
    });
    const populated = await Routine.findById(assignedRoutine._id)
      .populate({ path: 'days', populate: { path: 'exercises', populate: { path: 'videos' } } });
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error al asignar rutina', error });
  }
};
