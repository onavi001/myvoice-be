import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Routine from '../models/Routine';
import { sendError, sendSuccess } from '../utils/apiResponse';
import { createRoutineSchema, updateRoutineSchema } from '../validators/routineValidators';
import {
  addDayWithExercises,
  canUserAccessRoutine,
  createRoutineWithRelations,
  deleteRoutineCascade,
  generateRoutineDraft,
  generateRoutineFromImport,
  getRoutineForUser,
  listRoutinesForUser,
  resetRoutineProgressForUser,
  RoutineEquipment,
  RoutineGoal,
  RoutineLevel,
  updateRoutineWithRelations,
} from '../services/routineService';
import { upsertTrainingProfileService } from '../services/trainingProfileService';
import { buildSessionExercisePlan } from '../services/routineExercisePlan';

async function populateRoutineById(routineId: string) {
  return Routine.findById(routineId).populate({
    path: 'days',
    populate: { path: 'exercises', populate: { path: 'videos' } },
  });
}


// GET /api/routines - Listar rutinas del usuario o coach
export const listRoutines = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const routines = await listRoutinesForUser(userId);
    return sendSuccess(res, 200, 'Rutinas obtenidas correctamente', routines);
  } catch (error) {
    return sendError(res, 500, 'Error al obtener rutinas');
  }
};

// GET /api/routines/:routineId - Obtener rutina por ID
export const getRoutine = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { routineId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(routineId)) {
    return sendError(res, 400, 'ID de rutina inválido');
  }
  try {
    const result = await getRoutineForUser(userId, routineId);
    if (result.status === 'not_found') return sendError(res, 404, 'Rutina no encontrada');
    if (result.status === 'forbidden') return sendError(res, 403, 'No autorizado');
    return sendSuccess(res, 200, 'Rutina obtenida correctamente', result.routine);
  } catch (error) {
    return sendError(res, 500, 'Error al obtener rutina');
  }
};

// PUT /api/routines/:routineId - Actualizar rutina
export const updateRoutine = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { routineId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(routineId)) {
    return sendError(res, 400, 'ID de rutina inválido');
  }
  try {
    const parsed = updateRoutineSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'Datos de rutina inválidos', parsed.error.issues);
    }
    const { routineData } = parsed.data;
    const routine = await Routine.findById(routineId).lean();
    if (!routine) return sendError(res, 404, 'Rutina no encontrada');
    if (!(await canUserAccessRoutine(userId, routine))) {
      return sendError(res, 403, 'No autorizado');
    }
    await updateRoutineWithRelations({
      routineId,
      name: routineData.name,
      days: routineData.days,
    });
    const updatedRoutine = await populateRoutineById(routineId);
    return sendSuccess(res, 200, 'Rutina actualizada correctamente', updatedRoutine);
  } catch (error) {
    return sendError(res, 500, 'Error al actualizar rutina');
  }
};

// POST /api/routines - Crear rutina
export const createRoutine = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const parsed = createRoutineSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'Datos de rutina inválidos', parsed.error.issues);
    }
    const { name, days, couchId } = parsed.data;

    const routineId = await createRoutineWithRelations({
      userId,
      couchId,
      name,
      days,
    });
    const populatedRoutine = await populateRoutineById(routineId);
    return sendSuccess(res, 201, 'Rutina creada correctamente', populatedRoutine);
  } catch (error) {
    return sendError(res, 500, 'Error al crear rutina');
  }
};

// DELETE /api/routines/:routineId - Eliminar rutina
export const deleteRoutine = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { routineId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(routineId)) {
    return sendError(res, 400, 'ID de rutina inválido');
  }
  try {
    const routine = await Routine.findById(routineId).lean();
    if (!routine) return sendError(res, 404, 'Rutina no encontrada');
    if (!(await canUserAccessRoutine(userId, routine))) {
      return sendError(res, 403, 'No autorizado');
    }
    const dayIds = (routine.days || []).map((dayId) => dayId.toString());
    await deleteRoutineCascade(routineId, dayIds);
    return sendSuccess(res, 200, 'Rutina eliminada correctamente', { id: routineId });
  } catch (error) {
    return sendError(res, 500, 'Error al eliminar rutina');
  }
};

// PUT /api/routines/:routineId/reset - Reiniciar progreso de rutina
export const resetRoutineProgress = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { routineId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(routineId)) {
    return sendError(res, 400, 'ID de rutina inválido');
  }
  try {
    const result = await resetRoutineProgressForUser(userId, routineId);
    if (result.status === 'not_found') return sendError(res, 404, 'Rutina no encontrada');
    if (result.status === 'forbidden') return sendError(res, 403, 'No autorizado');
    return sendSuccess(res, 200, 'Progreso de rutina reiniciado', { routineId });
  } catch (error) {
    return sendError(res, 500, 'Error al reiniciar rutina');
  }
};

// POST /api/routines/session-plan - Vista previa de ejercicios por sesión según perfil
export const getSessionExercisePlan = async (req: Request, res: Response) => {
  if (!req.userId) return sendError(res, 401, 'No autenticado');
  try {
    const {
      goal = 'hipertrofia',
      level = 'intermedio',
      equipment = 'gym',
      biologicalSex = 'masculino',
      heightCm = 170,
      weightKg = 70,
      sessionDurationMin = 60,
    } = req.body as {
      goal?: RoutineGoal;
      level?: RoutineLevel;
      equipment?: RoutineEquipment;
      biologicalSex?: 'masculino' | 'femenino';
      heightCm?: number;
      weightKg?: number;
      sessionDurationMin?: number;
    };

    const plan = buildSessionExercisePlan({
      goal,
      level,
      equipment,
      biologicalSex: biologicalSex === 'femenino' ? 'femenino' : 'masculino',
      heightCm: Math.min(230, Math.max(120, Number(heightCm) || 170)),
      weightKg: Math.min(250, Math.max(30, Number(weightKg) || 70)),
      sessionDurationMin: Math.min(180, Math.max(20, Number(sessionDurationMin) || 60)),
    });

    return sendSuccess(res, 200, 'Plan de sesión calculado', plan);
  } catch {
    return sendError(res, 500, 'Error al calcular plan de sesión');
  }
};

// POST /api/routines/generate - Generar rutina base
export const generateRoutine = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  try {
    const {
      name = 'Rutina IA',
      goal = 'hipertrofia',
      level = 'intermedio',
      days = 3,
      equipment = 'gym',
      notes = '',
      biologicalSex = 'masculino',
      heightCm = 170,
      weightKg = 70,
      sessionDurationMin = 60,
    } = req.body as {
      name?: string;
      goal?: RoutineGoal;
      level?: RoutineLevel;
      days?: number;
      equipment?: RoutineEquipment;
      notes?: string;
      biologicalSex?: 'masculino' | 'femenino';
      heightCm?: number;
      weightKg?: number;
      sessionDurationMin?: number;
    };
    const profilePayload = {
      biologicalSex: biologicalSex === 'femenino' ? 'femenino' : 'masculino',
      heightCm: Number(heightCm) || 170,
      weightKg: Number(weightKg) || 70,
      sessionDurationMin: Number(sessionDurationMin) || 60,
    } as const;

    await upsertTrainingProfileService(userId, profilePayload);

    const draft = await generateRoutineDraft({
      userId,
      name,
      goal,
      level,
      days: Number(days) || 3,
      equipment,
      notes,
      ...profilePayload,
    });
    return sendSuccess(res, 200, 'Rutina generada correctamente', draft);
  } catch (error) {
    return sendError(res, 500, 'Error al generar rutina');
  }
};

// POST /api/routines/generate-from-import - Rutina desde imagenes o texto de documento
export const generateRoutineFromImportHandler = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');

  try {
    const { name, notes, extractedText, images } = req.body as {
      name?: string;
      notes?: string;
      extractedText?: string;
      images?: string[];
    };

    const imageList = Array.isArray(images) ? images : [];
    if (imageList.length > 5) {
      return sendError(res, 400, 'Maximo 5 imagenes por solicitud');
    }

    const draft = await generateRoutineFromImport({
      userId,
      name,
      notes,
      extractedText,
      images: imageList,
    });
    return sendSuccess(res, 200, 'Rutina importada correctamente', draft);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al importar rutina';
    const status = message.includes('requiere') || message.includes('interpretar') ? 400 : 500;
    return sendError(res, status, message);
  }
};

// POST /api/routines/:routineId/days - Agregar día a rutina
export const addDayToRoutine = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, 'No autenticado');
  const { routineId } = req.params;
  try {
    const routine = await Routine.findById(routineId).lean();
    if (!routine) return sendError(res, 404, 'Rutina no encontrada');
    if (!(await canUserAccessRoutine(userId, routine))) {
      return sendError(res, 403, 'No autorizado');
    }
    const { dayName, musclesWorked, warmupOptions, explanation, exercises } = req.body;
    const day = await addDayWithExercises({
      routineId,
      dayName,
      musclesWorked,
      warmupOptions,
      explanation,
      exercises,
    });
    return sendSuccess(res, 201, 'Día agregado correctamente', day);
  } catch (error) {
    return sendError(res, 500, 'Error al agregar día');
  }
};
