import mongoose from 'mongoose';
import Progress from '../models/Progress';

type ServiceError = { ok: false; status: number; message: string };
type ServiceOk<T> = { ok: true; data: T };
type ServiceResult<T> = ServiceOk<T> | ServiceError;

export async function listProgressService(
  userId: string,
  filters: { routineId?: string; startDate?: string; endDate?: string }
): Promise<ServiceResult<unknown[]>> {
  const query: Record<string, unknown> = { userId: new mongoose.Types.ObjectId(userId) };
  if (filters.routineId) query.routineId = new mongoose.Types.ObjectId(filters.routineId);
  if (filters.startDate && filters.endDate) {
    query.date = { $gte: new Date(filters.startDate), $lte: new Date(filters.endDate) };
  }
  const progress = await Progress.find(query).lean();
  return { ok: true, data: progress };
}

export async function createProgressService(userId: string, payload: any): Promise<ServiceResult<unknown>> {
  const data = {
    ...payload,
    routineId: new mongoose.Types.ObjectId(payload.routineId),
    dayId: new mongoose.Types.ObjectId(payload.dayId),
    exerciseId: new mongoose.Types.ObjectId(payload.exerciseId),
    date: payload.date ? new Date(payload.date) : new Date(),
    userId: new mongoose.Types.ObjectId(userId),
  };
  const created = await Progress.create(data);
  return { ok: true, data: created };
}

export async function updateProgressService(userId: string, progressId: string, payload: any): Promise<ServiceResult<unknown>> {
  const updatePayload: Record<string, unknown> = { ...payload };
  if (payload.routineId) updatePayload.routineId = new mongoose.Types.ObjectId(payload.routineId);
  if (payload.dayId) updatePayload.dayId = new mongoose.Types.ObjectId(payload.dayId);
  if (payload.exerciseId) updatePayload.exerciseId = new mongoose.Types.ObjectId(payload.exerciseId);
  if (payload.date) updatePayload.date = new Date(payload.date);

  const updated = await Progress.findOneAndUpdate({ _id: progressId, userId }, updatePayload, { new: true, runValidators: true });
  if (!updated) return { ok: false, status: 404, message: 'Progreso no encontrado' };
  return { ok: true, data: updated };
}

export async function deleteProgressService(userId: string, progressId: string): Promise<ServiceResult<{ id: string }>> {
  const deleted = await Progress.findOneAndDelete({ _id: progressId, userId });
  if (!deleted) return { ok: false, status: 404, message: 'Progreso no encontrado' };
  return { ok: true, data: { id: progressId } };
}

export async function clearProgressService(userId: string): Promise<ServiceResult<{ cleared: true }>> {
  await Progress.deleteMany({ userId: new mongoose.Types.ObjectId(userId) });
  return { ok: true, data: { cleared: true } };
}
