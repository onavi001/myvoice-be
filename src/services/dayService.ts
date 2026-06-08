import mongoose from 'mongoose';
import Day from '../models/Day';
import Exercise from '../models/Exercise';
import Routine from '../models/Routine';
import { buildRoutineAccessQuery } from './routineService';

type ServiceError = { ok: false; status: number; message: string };
type ServiceOk<T> = { ok: true; data: T };
type ServiceResult<T> = ServiceOk<T> | ServiceError;

async function userOwnsDay(userId: string, dayId: string) {
  const accessQuery = await buildRoutineAccessQuery(userId);
  return Routine.exists({ days: dayId, ...accessQuery });
}

export async function updateDayService(userId: string, dayId: string, dayName?: string): Promise<ServiceResult<unknown>> {
  const ownsDay = await userOwnsDay(userId, dayId);
  if (!ownsDay) return { ok: false, status: 403, message: 'No autorizado' };
  const day = await Day.findByIdAndUpdate(dayId, { dayName }, { new: true }).populate('exercises').lean();
  if (!day) return { ok: false, status: 404, message: 'Día no encontrado' };
  return { ok: true, data: day };
}

export async function deleteDayService(userId: string, dayId: string): Promise<ServiceResult<{ id: string }>> {
  const ownsDay = await userOwnsDay(userId, dayId);
  if (!ownsDay) return { ok: false, status: 403, message: 'No autorizado' };
  const day = await Day.findById(dayId).lean();
  if (!day) return { ok: false, status: 404, message: 'Día no encontrado' };
  const exerciseIds = (day.exercises || []).map((exerciseId) => exerciseId.toString());
  if (exerciseIds.length > 0) await Exercise.deleteMany({ _id: { $in: exerciseIds } });
  await Day.findByIdAndDelete(dayId);
  await Routine.updateMany({ days: dayId }, { $pull: { days: dayId } });
  return { ok: true, data: { id: dayId } };
}

export async function resetDayProgressService(userId: string, dayId: string): Promise<ServiceResult<{ id: string }>> {
  const ownsDay = await userOwnsDay(userId, dayId);
  if (!ownsDay) return { ok: false, status: 403, message: 'No autorizado' };
  const day = await Day.findById(dayId).lean();
  if (!day) return { ok: false, status: 404, message: 'Día no encontrado' };
  const exerciseIds = (day.exercises || []).map((exerciseId) => exerciseId.toString());
  if (exerciseIds.length > 0) await Exercise.updateMany({ _id: { $in: exerciseIds } }, { $set: { completed: false } });
  return { ok: true, data: { id: dayId } };
}

export async function addExerciseToDayService(userId: string, dayId: string, exercisePayload: unknown): Promise<ServiceResult<unknown>> {
  const ownsDay = await userOwnsDay(userId, dayId);
  if (!ownsDay) return { ok: false, status: 403, message: 'No autorizado' };
  const day = await Day.findById(dayId);
  if (!day) return { ok: false, status: 404, message: 'Día no encontrado' };
  const exercise = await Exercise.create(exercisePayload);
  day.set('exercises', [...(day.exercises as unknown as mongoose.Types.ObjectId[]), exercise._id as mongoose.Types.ObjectId]);
  await day.save();
  return { ok: true, data: exercise };
}
