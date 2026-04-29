import CoachRequest from '../models/CoachRequest';
import Routine from '../models/Routine';
import User from '../models/Users';
import { runWithOptionalTransaction } from './transactionService';

type ServiceError = { ok: false; status: number; message: string };
type ServiceOk<T> = { ok: true; data: T };
type ServiceResult<T> = ServiceOk<T> | ServiceError;

export async function listCoachesService(): Promise<ServiceResult<unknown[]>> {
  const coaches = await User.find({ role: 'coach' }).select('-password').lean();
  const serializedCoaches = coaches.map((c) => ({
    _id: c._id.toString(),
    username: c.username,
    email: c.email,
    specialties: c.specialties,
    bio: c.bio,
  }));
  return { ok: true, data: serializedCoaches };
}

export async function requestCoachService(userId: string, coachId: string): Promise<ServiceResult<{ id: unknown }>> {
  const user = await User.findById(userId).lean();
  if (!user) return { ok: false, status: 404, message: 'Usuario no encontrado' };
  if (user.role !== 'user') return { ok: false, status: 403, message: 'Solo los usuarios pueden solicitar coaches' };
  if (user.coachId) return { ok: false, status: 400, message: 'Ya tienes un coach asignado' };

  const coach = await User.findById(coachId);
  if (!coach || coach.role !== 'coach') return { ok: false, status: 404, message: 'Coach no encontrado' };

  const existingRequest = await CoachRequest.findOne({ userId, status: 'pending' });
  if (existingRequest) return { ok: false, status: 400, message: 'Ya tienes una solicitud pendiente' };

  const coachRequest = new CoachRequest({ userId, coachId, status: 'pending' });
  await coachRequest.save();
  return { ok: true, data: { id: coachRequest._id } };
}

export async function getCoachRequestsService(userId: string): Promise<ServiceResult<unknown[]>> {
  const user = await User.findById(userId).lean();
  if (!user) return { ok: false, status: 404, message: 'Usuario no encontrado' };
  if (user.role !== 'coach') return { ok: false, status: 403, message: 'Solo los coaches pueden ver solicitudes' };

  const requests = await CoachRequest.find({ coachId: userId, status: 'pending' }).populate('userId', 'username email').lean();
  return { ok: true, data: requests };
}

export async function acceptCoachRequestService(coachId: string, clientId: string): Promise<ServiceResult<unknown>> {
  const coach = await User.findById(coachId).lean();
  if (!coach) return { ok: false, status: 404, message: 'Usuario no encontrado' };

  const request = await CoachRequest.findOne({ userId: clientId, coachId: coach._id, status: 'pending' });
  if (!request) return { ok: false, status: 404, message: 'Solicitud no encontrada' };

  request.status = 'accepted';
  await request.save();

  const user = await User.findById(clientId);
  if (!user) return { ok: false, status: 404, message: 'Usuario no encontrado' };
  user.coachId = coach._id;
  await user.save();

  await CoachRequest.updateMany({ userId: clientId, status: 'pending', _id: { $ne: request._id } }, { $set: { status: 'rejected' } });
  return { ok: true, data: user };
}

export async function rejectCoachRequestService(coachId: string, clientId: string): Promise<ServiceResult<unknown>> {
  const coach = await User.findById(coachId).lean();
  if (!coach) return { ok: false, status: 404, message: 'Usuario no encontrado' };

  const request = await CoachRequest.findOne({ userId: clientId, coachId: coach._id, status: 'pending' });
  if (!request) return { ok: false, status: 404, message: 'Solicitud no encontrada' };

  request.status = 'rejected';
  await request.save();
  return { ok: true, data: request };
}

export async function listClientsService(coachId: string): Promise<ServiceResult<unknown[]>> {
  const clients = await User.find({ coachId }).select('-password').lean();
  return { ok: true, data: clients };
}

export async function getClientProfileService(coachId: string, clientId: string): Promise<ServiceResult<unknown>> {
  const client = await User.findOne({ _id: clientId, coachId }).select('-password').lean();
  if (!client) return { ok: false, status: 404, message: 'Cliente no encontrado' };
  return { ok: true, data: client };
}

export async function updateClientProfileService(
  coachId: string,
  clientId: string,
  updates: { goals?: unknown; notes?: string }
): Promise<ServiceResult<unknown>> {
  const client = await User.findOne({ _id: clientId, coachId });
  if (!client) return { ok: false, status: 404, message: 'Cliente no encontrado' };
  if (updates.goals !== undefined) client.goals = updates.goals as never;
  if (updates.notes !== undefined) client.notes = updates.notes;
  await client.save();
  const serialized = await User.findById(client._id).select('-password').lean();
  return { ok: true, data: serialized };
}

export async function listClientRoutinesService(coachId: string, clientId: string): Promise<ServiceResult<unknown[]>> {
  const client = await User.findOne({ _id: clientId, coachId }).lean();
  if (!client) return { ok: false, status: 404, message: 'Cliente no encontrado' };
  const routines = await Routine.find({ userId: clientId })
    .populate({ path: 'days', populate: { path: 'exercises', populate: { path: 'videos' } } })
    .lean();
  return { ok: true, data: routines };
}

export async function assignClientRoutineService(coachId: string, clientId: string, routineId: string): Promise<ServiceResult<unknown>> {
  const client = await User.findOne({ _id: clientId, coachId }).lean();
  if (!client) return { ok: false, status: 404, message: 'Cliente no encontrado' };
  const sourceRoutine = await Routine.findById(routineId).lean();
  if (!sourceRoutine) return { ok: false, status: 404, message: 'Rutina no encontrada' };

  const assignedRoutineId = await runWithOptionalTransaction(
    async (session) => {
      const [assignedRoutine] = await Routine.create(
        [{ userId: clientId, couchId: coachId, name: sourceRoutine.name, days: sourceRoutine.days }],
        { session }
      );
      return assignedRoutine._id;
    },
    async () => {
      const assignedRoutine = await Routine.create({ userId: clientId, couchId: coachId, name: sourceRoutine.name, days: sourceRoutine.days });
      return assignedRoutine._id;
    }
  );

  const populated = await Routine.findById(assignedRoutineId).populate({ path: 'days', populate: { path: 'exercises', populate: { path: 'videos' } } });
  return { ok: true, data: populated };
}
