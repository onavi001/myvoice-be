import User from '../models/Users';
import {
  normalizeTrainingProfile,
  serializeTrainingProfile,
  TrainingProfile,
  TrainingProfilePayload,
} from '../types/trainingProfile';

type ServiceError = { ok: false; status: number; message: string };
type ServiceOk<T> = { ok: true; data: T };
type ServiceResult<T> = ServiceOk<T> | ServiceError;

export async function getTrainingProfileService(userId: string): Promise<ServiceResult<ReturnType<typeof serializeTrainingProfile>>> {
  const user = await User.findById(userId).select('trainingProfile').lean();
  if (!user) return { ok: false, status: 404, message: 'Usuario no encontrado' };
  const profile = user.trainingProfile as TrainingProfile | undefined;
  return { ok: true, data: serializeTrainingProfile(profile ?? null) };
}

export async function upsertTrainingProfileService(
  userId: string,
  payload: TrainingProfilePayload
): Promise<ServiceResult<ReturnType<typeof serializeTrainingProfile>>> {
  const normalized = normalizeTrainingProfile(payload);
  if (!normalized) {
    return { ok: false, status: 400, message: 'Perfil de entrenamiento inválido' };
  }

  const user = await User.findById(userId);
  if (!user) return { ok: false, status: 404, message: 'Usuario no encontrado' };

  user.trainingProfile = {
    ...normalized,
    updatedAt: new Date(),
  };
  await user.save();

  return { ok: true, data: serializeTrainingProfile(user.trainingProfile) };
}
