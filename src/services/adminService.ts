import { z } from 'zod';
import AdminCoachRequest from '../models/AdminCoachRequest';
import User from '../models/Users';
import { ensureCoachCode } from './coachHelpers';

type ServiceError = { ok: false; status: number; message: string; details?: unknown };
type ServiceOk<T> = { ok: true; data: T };
type ServiceResult<T> = ServiceOk<T> | ServiceError;

const UserUpdateSchema = z
  .object({
    name: z.string().min(3).max(50).regex(/^[a-zA-Z0-9\s-]+$/).optional(),
    username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9\s-]+$/).optional(),
    email: z.string().email().max(100),
    role: z.enum(['user', 'coach', 'admin']),
  })
  .refine((data) => Boolean(data.name ?? data.username), {
    message: 'El nombre es obligatorio',
    path: ['name'],
  })
  .transform((data) => ({
    name: (data.name ?? data.username)!,
    email: data.email,
    role: data.role,
  }));

async function requireRole(userId: string, role: 'admin' | 'user'): Promise<ServiceResult<null>> {
  const user = await User.findById(userId).select('role').lean();
  if (!user) return { ok: false, status: 404, message: 'Usuario no encontrado' };
  if (user.role !== role) {
    return {
      ok: false,
      status: 403,
      message: role === 'admin' ? 'Acceso denegado' : 'Solo los usuarios pueden ver sus solicitudes',
    };
  }
  return { ok: true, data: null };
}

export async function listUsersService(adminId: string): Promise<ServiceResult<unknown[]>> {
  const check = await requireRole(adminId, 'admin');
  if (!check.ok) return check;
  const users = await User.find().select('_id username email role');
  const serializedUsers = users.map((u) => ({ _id: u._id, username: u.username, email: u.email, role: u.role }));
  return { ok: true, data: serializedUsers };
}

export async function updateUserService(
  adminId: string,
  targetUserId: string,
  payload: unknown
): Promise<ServiceResult<unknown>> {
  const check = await requireRole(adminId, 'admin');
  if (!check.ok) return check;

  const validation = UserUpdateSchema.safeParse(payload);
  if (!validation.success) {
    const errors = validation.error.issues.map((err) => err.message).join(', ');
    return { ok: false, status: 400, message: `Validación fallida: ${errors}`, details: validation.error.issues };
  }

  const { name, email, role } = validation.data;
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) return { ok: false, status: 404, message: 'Usuario no encontrado' };

  const existingUser = await User.findOne({ email, _id: { $ne: targetUserId } });
  if (existingUser) return { ok: false, status: 400, message: 'El correo ya está en uso' };

  const updatedUser = await User.findByIdAndUpdate(
    targetUserId,
    { username: name, email, role },
    { new: true, select: '_id username email role' }
  );
  if (!updatedUser) return { ok: false, status: 500, message: 'Error al actualizar usuario' };

  if (role === 'coach') {
    await ensureCoachCode(targetUserId);
  }

  return {
    ok: true,
    data: { _id: updatedUser._id, username: updatedUser.username, email: updatedUser.email, role: updatedUser.role },
  };
}

export async function getUserCoachRequestService(userId: string): Promise<ServiceResult<unknown>> {
  const check = await requireRole(userId, 'user');
  if (!check.ok) return check;

  const request = await AdminCoachRequest.findOne({ userId })
    .sort({ createdAt: -1 })
    .populate('userId', '_id username email role')
    .lean();

  if (!request || Array.isArray(request)) return { ok: true, data: null };

  const serializedRequest = {
    _id: (request as any)._id,
    userId: {
      _id: (request as any).userId?._id?.toString(),
      name: (request as any).userId?.username,
      email: (request as any).userId?.email,
      role: (request as any).userId?.role,
    },
    message: (request as any).message,
    status: (request as any).status,
    createdAt: (request as any).createdAt?.toISOString(),
  };
  return { ok: true, data: serializedRequest };
}

export async function listCoachRequestsService(adminId: string): Promise<ServiceResult<unknown[]>> {
  const check = await requireRole(adminId, 'admin');
  if (!check.ok) return check;

  const requests = await AdminCoachRequest.find()
    .sort({ createdAt: -1 })
    .populate('userId', '_id username email role')
    .lean();
  return { ok: true, data: requests };
}

export async function createCoachRequestService(userId: string, message: string): Promise<ServiceResult<unknown>> {
  const check = await requireRole(userId, 'user');
  if (!check.ok) return { ok: false, status: 403, message: 'Solo usuarios pueden solicitar' };

  const existingPending = await AdminCoachRequest.findOne({ userId, status: 'pending' }).lean();
  if (existingPending) return { ok: false, status: 400, message: 'Ya tienes una solicitud pendiente' };

  const request = await AdminCoachRequest.create({ userId, message, status: 'pending' });
  const populated = await AdminCoachRequest.findById(request._id).populate('userId', '_id username email role');
  return { ok: true, data: populated };
}

export async function approveCoachRequestService(adminId: string, requestId: string): Promise<ServiceResult<unknown>> {
  const check = await requireRole(adminId, 'admin');
  if (!check.ok) return check;

  const request = await AdminCoachRequest.findById(requestId);
  if (!request) return { ok: false, status: 404, message: 'Solicitud no encontrada' };
  request.status = 'approved';
  await request.save();
  await User.findByIdAndUpdate(request.userId, { $set: { role: 'coach' } });
  await ensureCoachCode(request.userId.toString());
  const populated = await AdminCoachRequest.findById(request._id).populate('userId', '_id username email role');
  return { ok: true, data: populated };
}

export async function rejectCoachRequestService(adminId: string, requestId: string): Promise<ServiceResult<unknown>> {
  const check = await requireRole(adminId, 'admin');
  if (!check.ok) return check;

  const request = await AdminCoachRequest.findById(requestId);
  if (!request) return { ok: false, status: 404, message: 'Solicitud no encontrada' };
  request.status = 'rejected';
  await request.save();
  const populated = await AdminCoachRequest.findById(request._id).populate('userId', '_id username email role');
  return { ok: true, data: populated };
}
