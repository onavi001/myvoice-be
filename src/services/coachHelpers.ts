import User from '../models/Users';
import { COACH_FREE_CLIENT_LIMIT } from '../config/coach';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCoachCodeCandidate(): string {
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return `MV-${suffix}`;
}

export function normalizeCoachCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export async function ensureCoachCode(coachId: string): Promise<string> {
  const coach = await User.findById(coachId);
  if (!coach || coach.role !== 'coach') {
    throw new Error('Coach no encontrado');
  }
  if (coach.coachCode) return coach.coachCode;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = generateCoachCodeCandidate();
    const exists = await User.findOne({ coachCode: candidate }).select('_id').lean();
    if (!exists) {
      coach.coachCode = candidate;
      await coach.save();
      return candidate;
    }
  }

  throw new Error('No se pudo generar código de coach');
}

export async function countCoachClients(coachId: string): Promise<number> {
  return User.countDocuments({ coachId });
}

export async function coachClientLimitStatus(coachId: string): Promise<{
  clientCount: number;
  clientLimit: number;
  atLimit: boolean;
}> {
  const clientCount = await countCoachClients(coachId);
  const clientLimit = COACH_FREE_CLIENT_LIMIT;
  return {
    clientCount,
    clientLimit,
    atLimit: clientCount >= clientLimit,
  };
}

export async function assertCoachCanAcceptClient(
  coachId: string
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const status = await coachClientLimitStatus(coachId);
  if (status.atLimit) {
    return {
      ok: false,
      status: 403,
      message: `Límite de clientes alcanzado (${status.clientLimit}). Contacta soporte para ampliar tu plan.`,
    };
  }
  return { ok: true };
}
