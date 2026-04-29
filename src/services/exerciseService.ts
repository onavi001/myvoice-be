import Day from '../models/Day';
import Exercise from '../models/Exercise';
import Routine from '../models/Routine';

type ServiceError = { ok: false; status: number; message: string };
type ServiceOk<T> = { ok: true; data: T };
type ServiceResult<T> = ServiceOk<T> | ServiceError;

async function userOwnsExercise(userId: string, exerciseId: string) {
  const day = await Day.findOne({ exercises: exerciseId }).select('_id').lean();
  if (!day?._id) return false;
  const routine = await Routine.findOne({ days: day._id, $or: [{ userId }, { couchId: userId }] }).select('_id').lean();
  return Boolean(routine?._id);
}

export async function updateExerciseService(userId: string, exerciseId: string, updateData: unknown): Promise<ServiceResult<unknown>> {
  const ownsExercise = await userOwnsExercise(userId, exerciseId);
  if (!ownsExercise) return { ok: false, status: 403, message: 'No autorizado' };
  const exercise = await Exercise.findByIdAndUpdate(
    exerciseId,
    updateData as Record<string, unknown>,
    { new: true, runValidators: true }
  )
    .populate('videos')
    .lean();
  if (!exercise) return { ok: false, status: 404, message: 'Ejercicio no encontrado' };
  return { ok: true, data: exercise };
}

export async function deleteExerciseService(userId: string, exerciseId: string): Promise<ServiceResult<{ id: string }>> {
  const ownsExercise = await userOwnsExercise(userId, exerciseId);
  if (!ownsExercise) return { ok: false, status: 403, message: 'No autorizado' };
  const deleted = await Exercise.findByIdAndDelete(exerciseId);
  if (!deleted) return { ok: false, status: 404, message: 'Ejercicio no encontrado' };
  await Day.updateMany({ exercises: exerciseId }, { $pull: { exercises: exerciseId } });
  return { ok: true, data: { id: exerciseId } };
}

export async function generateExercisesService(): Promise<ServiceResult<unknown[]>> {
  const suggestions = [
    { name: 'Sentadilla Goblet', sets: 3, reps: 12, repsUnit: 'count', weightUnit: 'kg', weight: 0, rest: '60', tips: ['Controla el descenso'], muscleGroup: ['Piernas'] },
    { name: 'Press de hombro mancuernas', sets: 3, reps: 10, repsUnit: 'count', weightUnit: 'kg', weight: 0, rest: '60', tips: ['No arquees la espalda'], muscleGroup: ['Hombros'] },
    { name: 'Plancha frontal', sets: 3, reps: 30, repsUnit: 'seconds', weightUnit: 'kg', weight: 0, rest: '45', tips: ['Mantén el core activo'], muscleGroup: ['Core'] },
  ];
  return { ok: true, data: suggestions };
}
