import mongoose from 'mongoose';
import CoachRequest from '../models/CoachRequest';
import Progress from '../models/Progress';
import Routine from '../models/Routine';
import User from '../models/Users';
import { COACH_ASSIGNMENT_MESSAGE_MAX } from '../config/coach';
import {
  assertCoachCanAcceptClient,
  coachClientLimitStatus,
  ensureCoachCode,
  normalizeCoachCode,
} from './coachHelpers';
import { listProgressService } from './progressService';
import { createRoutineWithRelations } from './routineService';
import { runWithOptionalTransaction } from './transactionService';

type ServiceError = { ok: false; status: number; message: string };
type ServiceOk<T> = { ok: true; data: T };
type ServiceResult<T> = ServiceOk<T> | ServiceError;

const CLIENT_PROFILE_SELECT = 'username bio goals notes trainingProfile role coachId createdAt updatedAt';

function serializeCoachPublic(coach: {
  _id?: unknown;
  username?: string;
  bio?: string;
  specialties?: string[] | string;
}) {
  const specialties = Array.isArray(coach.specialties)
    ? coach.specialties
    : coach.specialties
      ? [coach.specialties]
      : undefined;
  return {
    _id: String(coach._id ?? ""),
    username: coach.username,
    bio: coach.bio,
    specialties,
  };
}

function serializeClientForCoach(client: {
  _id?: unknown;
  username?: string;
  bio?: string;
  goals?: string[];
  notes?: string;
  trainingProfile?: unknown;
  role?: string;
  coachId?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    _id: String(client._id ?? ""),
    username: client.username,
    bio: client.bio,
    goals: client.goals,
    notes: client.notes,
    trainingProfile: client.trainingProfile,
    role: client.role,
    coachId: client.coachId?.toString(),
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

export async function listCoachesService(): Promise<ServiceResult<unknown[]>> {
  const coaches = await User.find({ role: 'coach' }).select('username bio specialties').lean();
  const serializedCoaches = coaches.map((c) => serializeCoachPublic(c));
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

export async function requestCoachByCodeService(userId: string, rawCode: string): Promise<ServiceResult<{ id: unknown }>> {
  const code = normalizeCoachCode(rawCode);
  if (!code) return { ok: false, status: 400, message: 'Código inválido' };

  const coach = await User.findOne({ coachCode: code, role: 'coach' }).lean();
  if (!coach) return { ok: false, status: 404, message: 'Coach no encontrado con ese código' };

  return requestCoachService(userId, coach._id.toString());
}

export async function getCoachByCodeService(rawCode: string): Promise<ServiceResult<unknown>> {
  const code = normalizeCoachCode(rawCode);
  if (!code) return { ok: false, status: 400, message: 'Código inválido' };

  const coach = await User.findOne({ coachCode: code, role: 'coach' })
    .select('username bio specialties coachCode')
    .lean();
  if (!coach) return { ok: false, status: 404, message: 'Coach no encontrado' };

  const limitStatus = await coachClientLimitStatus(coach._id.toString());
  return {
    ok: true,
    data: {
      ...serializeCoachPublic(coach),
      coachCode: coach.coachCode,
      acceptingClients: !limitStatus.atLimit,
      clientCount: limitStatus.clientCount,
      clientLimit: limitStatus.clientLimit,
    },
  };
}

export async function getCoachProfileService(coachId: string): Promise<ServiceResult<unknown>> {
  const coach = await User.findById(coachId).lean();
  if (!coach) return { ok: false, status: 404, message: 'Usuario no encontrado' };
  if (coach.role !== 'coach') return { ok: false, status: 403, message: 'Solo coaches pueden ver este perfil' };

  const coachCode = await ensureCoachCode(coachId);
  const limitStatus = await coachClientLimitStatus(coachId);

  return {
    ok: true,
    data: {
      coachCode,
      clientCount: limitStatus.clientCount,
      clientLimit: limitStatus.clientLimit,
      atLimit: limitStatus.atLimit,
    },
  };
}

export async function getCoachRequestsService(userId: string): Promise<ServiceResult<unknown[]>> {
  const user = await User.findById(userId).lean();
  if (!user) return { ok: false, status: 404, message: 'Usuario no encontrado' };
  if (user.role !== 'coach') return { ok: false, status: 403, message: 'Solo los coaches pueden ver solicitudes' };

  const requests = await CoachRequest.find({ coachId: userId, status: 'pending' })
    .populate('userId', 'username bio goals notes trainingProfile')
    .lean();
  return { ok: true, data: requests };
}

export async function acceptCoachRequestService(coachId: string, clientId: string): Promise<ServiceResult<unknown>> {
  const coach = await User.findById(coachId).lean();
  if (!coach) return { ok: false, status: 404, message: 'Usuario no encontrado' };

  const limitCheck = await assertCoachCanAcceptClient(coachId);
  if (!limitCheck.ok) return { ok: false, status: limitCheck.status, message: limitCheck.message };

  const request = await CoachRequest.findOne({ userId: clientId, coachId: coach._id, status: 'pending' });
  if (!request) return { ok: false, status: 404, message: 'Solicitud no encontrada' };

  request.status = 'accepted';
  await request.save();

  const user = await User.findById(clientId);
  if (!user) return { ok: false, status: 404, message: 'Usuario no encontrado' };
  user.coachId = coach._id;
  await user.save();

  await CoachRequest.updateMany({ userId: clientId, status: 'pending', _id: { $ne: request._id } }, { $set: { status: 'rejected' } });
  return { ok: true, data: serializeClientForCoach(user) };
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

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mondayOfCurrentWeek(now = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function buildClientActivitySummaries(
  clientIds: mongoose.Types.ObjectId[]
): Promise<Map<string, { lastSessionAt: string | null; daysSinceLastSession: number | null; weekTrainingDays: number }>> {
  const result = new Map<string, { lastSessionAt: string | null; daysSinceLastSession: number | null; weekTrainingDays: number }>();
  if (clientIds.length === 0) return result;

  const weekStart = mondayOfCurrentWeek();
  const [latestSessions, weekEntries] = await Promise.all([
    Progress.aggregate<{ _id: mongoose.Types.ObjectId; lastSessionAt: Date }>([
      { $match: { userId: { $in: clientIds }, completed: true } },
      { $sort: { date: -1 } },
      { $group: { _id: '$userId', lastSessionAt: { $first: '$date' } } },
    ]),
    Progress.find({
      userId: { $in: clientIds },
      completed: true,
      date: { $gte: weekStart },
    })
      .select('userId date')
      .lean(),
  ]);

  const weekDaysByClient = new Map<string, Set<string>>();
  for (const entry of weekEntries) {
    const clientKey = entry.userId.toString();
    if (!weekDaysByClient.has(clientKey)) weekDaysByClient.set(clientKey, new Set());
    weekDaysByClient.get(clientKey)!.add(localDateKey(new Date(entry.date)));
  }

  const now = Date.now();
  for (const row of latestSessions) {
    const clientKey = row._id.toString();
    const lastSessionAt = new Date(row.lastSessionAt).toISOString();
    const daysSinceLastSession = Math.floor((now - new Date(row.lastSessionAt).getTime()) / 86400000);
    result.set(clientKey, {
      lastSessionAt,
      daysSinceLastSession,
      weekTrainingDays: weekDaysByClient.get(clientKey)?.size ?? 0,
    });
  }

  for (const clientId of clientIds) {
    const clientKey = clientId.toString();
    if (!result.has(clientKey)) {
      result.set(clientKey, { lastSessionAt: null, daysSinceLastSession: null, weekTrainingDays: 0 });
    }
  }

  return result;
}

export async function listClientsService(coachId: string): Promise<ServiceResult<unknown[]>> {
  const clients = await User.find({ coachId }).select(CLIENT_PROFILE_SELECT).lean();
  const clientIds = clients.map((c) => c._id);
  const activityByClient = await buildClientActivitySummaries(clientIds);

  const enriched = await Promise.all(
    clients.map(async (client) => {
      const assignedRoutineCount = await Routine.countDocuments({
        userId: client._id,
        couchId: coachId,
      });
      const clientKey = client._id.toString();
      return {
        ...serializeClientForCoach(client),
        assignedRoutineCount,
        activity: activityByClient.get(clientKey) ?? {
          lastSessionAt: null,
          daysSinceLastSession: null,
          weekTrainingDays: 0,
        },
      };
    })
  );
  return { ok: true, data: enriched };
}

export async function getMyCoachOverviewService(userId: string): Promise<ServiceResult<unknown>> {
  const user = await User.findById(userId).lean();
  if (!user) return { ok: false, status: 404, message: 'Usuario no encontrado' };
  if (user.role !== 'user') {
    return { ok: true, data: { status: 'not_applicable' } };
  }

  if (user.coachId) {
    const coach = await User.findById(user.coachId).select('username bio specialties').lean();
    if (!coach) {
      return { ok: true, data: { status: 'none' } };
    }
    const assignedRoutineCount = await Routine.countDocuments({
      userId,
      couchId: user.coachId,
    });
    const pendingAssignments = await Routine.find({
      userId,
      couchId: user.coachId,
      $or: [{ assignmentSeenAt: { $exists: false } }, { assignmentSeenAt: null }],
    })
      .select('name coachMessage createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return {
      ok: true,
      data: {
        status: 'assigned',
        coach: serializeCoachPublic(coach),
        assignedRoutineCount,
        pendingAssignments: pendingAssignments.map((routine) => ({
          routineId: routine._id.toString(),
          routineName: routine.name,
          coachMessage: routine.coachMessage ?? '',
          assignedAt: routine.createdAt.toISOString(),
        })),
      },
    };
  }

  const pending = await CoachRequest.findOne({ userId, status: 'pending' })
    .populate('coachId', 'username bio specialties')
    .lean();

  if (pending) {
    const coachRef = pending.coachId as {
      _id?: { toString(): string };
      username?: string;
      bio?: string;
      specialties?: string[];
    } | null;
    return {
      ok: true,
      data: {
        status: 'pending',
        pendingRequest: {
          _id: pending._id.toString(),
          createdAt: pending.createdAt,
          coach: coachRef ? serializeCoachPublic(coachRef) : null,
        },
      },
    };
  }

  return { ok: true, data: { status: 'none' } };
}

export async function getClientProfileService(coachId: string, clientId: string): Promise<ServiceResult<unknown>> {
  const client = await User.findOne({ _id: clientId, coachId }).select(CLIENT_PROFILE_SELECT).lean();
  if (!client) return { ok: false, status: 404, message: 'Cliente no encontrado' };
  return { ok: true, data: serializeClientForCoach(client) };
}

export async function updateClientProfileService(
  coachId: string,
  clientId: string,
  updates: { goals?: unknown; notes?: string }
): Promise<ServiceResult<unknown>> {
  const client = await User.findOne({ _id: clientId, coachId });
  if (!client) return { ok: false, status: 404, message: 'Cliente no encontrado' };
  if (updates.goals !== undefined) {
    if (typeof updates.goals === 'string') {
      client.goals = updates.goals
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean);
    } else if (Array.isArray(updates.goals)) {
      client.goals = updates.goals.map(String);
    }
  }
  if (updates.notes !== undefined) client.notes = updates.notes;
  await client.save();
  const serialized = await User.findById(client._id).select(CLIENT_PROFILE_SELECT).lean();
  if (!serialized) return { ok: false, status: 404, message: 'Cliente no encontrado' };
  return { ok: true, data: serializeClientForCoach(serialized) };
}

export async function listClientRoutinesService(coachId: string, clientId: string): Promise<ServiceResult<unknown[]>> {
  const client = await User.findOne({ _id: clientId, coachId }).lean();
  if (!client) return { ok: false, status: 404, message: 'Cliente no encontrado' };
  const routines = await Routine.find({ userId: clientId })
    .populate({ path: 'days', populate: { path: 'exercises', populate: { path: 'videos' } } })
    .lean();
  return { ok: true, data: routines };
}

export async function listClientProgressService(
  coachId: string,
  clientId: string,
  filters: { routineId?: string; startDate?: string; endDate?: string }
): Promise<ServiceResult<unknown[]>> {
  const client = await User.findOne({ _id: clientId, coachId }).lean();
  if (!client) return { ok: false, status: 404, message: 'Cliente no encontrado' };
  return listProgressService(clientId, filters);
}

export async function assignClientRoutineService(
  coachId: string,
  clientId: string,
  routineId: string,
  assignedName: string,
  coachMessage?: string
): Promise<ServiceResult<unknown>> {
  const client = await User.findOne({ _id: clientId, coachId }).lean();
  if (!client) return { ok: false, status: 404, message: 'Cliente no encontrado' };
  const sourceRoutine = await Routine.findById(routineId)
    .populate({
      path: 'days',
      populate: { path: 'exercises' },
    })
    .lean();
  if (!sourceRoutine) return { ok: false, status: 404, message: 'Rutina no encontrada' };
  if (sourceRoutine.userId.toString() !== coachId) {
    return { ok: false, status: 403, message: 'Solo puedes asignar rutinas que hayas creado' };
  }

  const trimmedMessage = coachMessage?.trim().slice(0, COACH_ASSIGNMENT_MESSAGE_MAX);
  const routineName = assignedName.trim().slice(0, 80) || sourceRoutine.name;
  type PopulatedExercise = {
    name?: string;
    muscleGroup?: string[];
    sets?: number;
    reps?: number;
    repsUnit?: 'count' | 'seconds';
    weightUnit?: 'kg' | 'lb';
    weight?: number;
    rest?: string;
    tips?: string[];
    notes?: string;
    circuitId?: string;
  };
  type PopulatedDay = {
    dayName: string;
    musclesWorked?: string[];
    warmupOptions?: string[];
    explanation?: string;
    exercises?: PopulatedExercise[];
  };

  const days = (sourceRoutine.days as unknown as PopulatedDay[]).map((day) => ({
    dayName: day.dayName,
    musclesWorked: day.musclesWorked || [],
    warmupOptions: day.warmupOptions || [],
    explanation: day.explanation || '',
    exercises: (day.exercises || []).map((exercise) => ({
      name: exercise.name || 'Ejercicio',
      muscleGroup: exercise.muscleGroup || [],
      sets: exercise.sets ?? 3,
      reps: exercise.reps ?? 10,
      repsUnit: exercise.repsUnit || 'count',
      weightUnit: exercise.weightUnit || 'kg',
      weight: exercise.weight ?? 0,
      rest: exercise.rest || '60',
      tips: exercise.tips || [],
      notes: exercise.notes,
      circuitId: exercise.circuitId,
      completed: false,
    })),
  }));

  const assignedRoutineId = await createRoutineWithRelations({
    userId: clientId,
    couchId: coachId,
    name: routineName,
    days,
  });

  if (trimmedMessage) {
    await Routine.findByIdAndUpdate(assignedRoutineId, { coachMessage: trimmedMessage });
  }

  const populated = await Routine.findById(assignedRoutineId).populate({
    path: 'days',
    populate: { path: 'exercises', populate: { path: 'videos' } },
  });
  return { ok: true, data: populated };
}

export async function markAssignmentSeenService(userId: string, routineId: string): Promise<ServiceResult<unknown>> {
  const routine = await Routine.findOne({ _id: routineId, userId, couchId: { $exists: true, $ne: null } });
  if (!routine) return { ok: false, status: 404, message: 'Rutina no encontrada' };

  routine.assignmentSeenAt = new Date();
  await routine.save();

  return {
    ok: true,
    data: {
      routineId: routine._id.toString(),
      assignmentSeenAt: routine.assignmentSeenAt.toISOString(),
    },
  };
}

async function unlinkCoachFromClient(
  clientId: string,
  coachId: string
): Promise<ServiceResult<{ clientId: string; coachId: string }>> {
  const client = await User.findById(clientId);
  if (!client) return { ok: false, status: 404, message: 'Usuario no encontrado' };
  if (!client.coachId || client.coachId.toString() !== coachId) {
    return { ok: false, status: 400, message: 'No hay relación activa con ese coach' };
  }

  client.coachId = undefined;
  await client.save();

  await Routine.updateMany(
    { userId: clientId, couchId: coachId },
    { $unset: { couchId: 1, coachMessage: 1, assignmentSeenAt: 1 } }
  );

  return { ok: true, data: { clientId, coachId } };
}

export async function leaveCoachService(
  userId: string
): Promise<ServiceResult<{ action: 'left' | 'cancelled_pending'; clientId?: string; coachId?: string }>> {
  const user = await User.findById(userId);
  if (!user) return { ok: false, status: 404, message: 'Usuario no encontrado' };
  if (user.role !== 'user') return { ok: false, status: 403, message: 'Solo los usuarios pueden dejar a un coach' };

  if (user.coachId) {
    const coachId = user.coachId.toString();
    const result = await unlinkCoachFromClient(userId, coachId);
    if (!result.ok) return result;
    return { ok: true, data: { action: 'left', clientId: userId, coachId: result.data.coachId } };
  }

  const pending = await CoachRequest.findOne({ userId, status: 'pending' });
  if (pending) {
    pending.status = 'rejected';
    await pending.save();
    return { ok: true, data: { action: 'cancelled_pending' } };
  }

  return { ok: false, status: 400, message: 'No tienes coach ni solicitudes pendientes' };
}

export async function removeClientService(
  coachId: string,
  clientId: string
): Promise<ServiceResult<{ clientId: string; coachId: string }>> {
  const coach = await User.findById(coachId).lean();
  if (!coach) return { ok: false, status: 404, message: 'Usuario no encontrado' };
  if (coach.role !== 'coach') return { ok: false, status: 403, message: 'Solo los coaches pueden eliminar clientes' };

  return unlinkCoachFromClient(clientId, coachId);
}
