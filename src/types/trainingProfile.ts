export type BiologicalSex = 'masculino' | 'femenino';

export interface TrainingProfilePayload {
  biologicalSex?: BiologicalSex | string;
  heightCm?: number;
  weightKg?: number;
  sessionDurationMin?: number;
}

export interface TrainingProfile {
  biologicalSex: BiologicalSex;
  heightCm: number;
  weightKg: number;
  sessionDurationMin: number;
  updatedAt?: Date;
}

export function normalizeTrainingProfile(
  input: TrainingProfilePayload | null | undefined
): TrainingProfile | null {
  if (!input) return null;

  const heightRaw = Number(input.heightCm);
  const weightRaw = Number(input.weightKg);
  const durationRaw = Number(input.sessionDurationMin);
  const hasSex = input.biologicalSex === 'femenino' || input.biologicalSex === 'masculino';
  const hasHeight = Number.isFinite(heightRaw) && heightRaw > 0;
  const hasWeight = Number.isFinite(weightRaw) && weightRaw > 0;
  const hasDuration = Number.isFinite(durationRaw) && durationRaw > 0;

  if (!hasSex && !hasHeight && !hasWeight && !hasDuration) return null;

  return {
    biologicalSex: input.biologicalSex === 'femenino' ? 'femenino' : 'masculino',
    heightCm: hasHeight ? Math.min(230, Math.max(120, Math.round(heightRaw))) : 170,
    weightKg: hasWeight ? Math.min(250, Math.max(30, Math.round(weightRaw * 10) / 10)) : 70,
    sessionDurationMin: hasDuration ? Math.min(180, Math.max(20, Math.round(durationRaw))) : 60,
  };
}

export function serializeTrainingProfile(profile: TrainingProfile | null | undefined) {
  if (!profile) return null;
  return {
    biologicalSex: profile.biologicalSex,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    sessionDurationMin: profile.sessionDurationMin,
    updatedAt: profile.updatedAt ? new Date(profile.updatedAt).toISOString() : undefined,
  };
}
