import Exercise from '../models/Exercise';
import Day from '../models/Day';
import Routine from '../models/Routine';
import { buildRoutineAccessQuery } from './routineService';
import { requestGroqJson } from './groqService';
import type { GenerateExercisesInput } from '../validators/exerciseValidators';

type ServiceError = { ok: false; status: number; message: string };
type ServiceOk<T> = { ok: true; data: T };
type ServiceResult<T> = ServiceOk<T> | ServiceError;

export type ExerciseAlternative = {
  name: string;
  sets: number;
  reps: number;
  repsUnit: 'count' | 'seconds';
  weightUnit: 'kg' | 'lb';
  weight: number;
  rest: string;
  tips: string[];
  muscleGroup: string[];
};

const FALLBACK_BY_MUSCLE: Record<string, string[]> = {
  Piernas: ['Zancadas', 'Prensa de piernas', 'Sentadilla búlgara', 'Puente de glúteos'],
  Pecho: ['Press inclinado mancuernas', 'Aperturas', 'Fondos en banco', 'Cruce de poleas'],
  Espalda: ['Jalón al pecho', 'Remo en polea', 'Dominadas asistidas', 'Peso muerto convencional'],
  Hombros: ['Elevaciones laterales', 'Pájaros', 'Press Arnold', 'Face pull'],
  Core: ['Dead bug', 'Crunch bicicleta', 'Plancha lateral', 'Rollout con rueda'],
  Biceps: ['Curl martillo', 'Curl en polea', 'Curl concentrado'],
  Triceps: ['Extensiones en polea', 'Fondos en paralelas', 'Press francés'],
  Gluteos: ['Hip thrust', 'Patada de glúteo', 'Puente monoculo'],
};

async function userOwnsExercise(userId: string, exerciseId: string) {
  const day = await Day.findOne({ exercises: exerciseId }).select('_id').lean();
  if (!day?._id) return false;
  const accessQuery = await buildRoutineAccessQuery(userId);
  const routine = await Routine.findOne({ days: day._id, ...accessQuery })
    .select('_id')
    .lean();
  return Boolean(routine?._id);
}

function parseAlternativesJson(content: string): ExerciseAlternative[] {
  const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();

  const tryParse = (raw: string) => {
    try {
      return JSON.parse(raw) as { alternatives?: ExerciseAlternative[] } | ExerciseAlternative[];
    } catch {
      return null;
    }
  };

  let parsed = tryParse(cleaned);
  if (!parsed) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) parsed = tryParse(cleaned.slice(start, end + 1));
  }
  if (!parsed) {
    const arrStart = cleaned.indexOf('[');
    const arrEnd = cleaned.lastIndexOf(']');
    if (arrStart !== -1 && arrEnd > arrStart) parsed = tryParse(cleaned.slice(arrStart, arrEnd + 1));
  }

  const list = Array.isArray(parsed)
    ? parsed
    : parsed && 'alternatives' in parsed && Array.isArray(parsed.alternatives)
      ? parsed.alternatives
      : [];

  return list
    .filter((item) => item && typeof item.name === 'string' && item.name.trim())
    .map((item) => normalizeAlternative(item));
}

function normalizeAlternative(raw: Partial<ExerciseAlternative>): ExerciseAlternative {
  return {
    name: raw.name?.trim() || 'Ejercicio alternativo',
    sets: Number.isFinite(raw.sets) && (raw.sets as number) > 0 ? (raw.sets as number) : 3,
    reps: Number.isFinite(raw.reps) && (raw.reps as number) > 0 ? (raw.reps as number) : 10,
    repsUnit: raw.repsUnit === 'seconds' ? 'seconds' : 'count',
    weightUnit: raw.weightUnit === 'lb' ? 'lb' : 'kg',
    weight: Number.isFinite(raw.weight) ? (raw.weight as number) : 0,
    rest: raw.rest?.toString() || '60',
    tips: Array.isArray(raw.tips) ? raw.tips.filter(Boolean) : [],
    muscleGroup: Array.isArray(raw.muscleGroup) ? raw.muscleGroup.filter(Boolean) : [],
  };
}

function buildFallbackAlternatives(
  current: {
    name: string;
    muscleGroup?: string[];
    sets?: number;
    reps?: number;
    repsUnit?: string;
    weightUnit?: string;
    weight?: number;
    rest?: string;
    tips?: string[];
  },
  excludeNames: string[]
): ExerciseAlternative[] {
  const exclude = new Set(excludeNames.map((n) => n.toLowerCase().trim()));
  exclude.add(current.name.toLowerCase().trim());

  const muscles = current.muscleGroup?.length ? current.muscleGroup : ['General'];
  const candidates: string[] = [];

  muscles.forEach((muscle) => {
    const list = FALLBACK_BY_MUSCLE[muscle] ?? FALLBACK_BY_MUSCLE.Piernas;
    list.forEach((name) => {
      if (!exclude.has(name.toLowerCase())) candidates.push(name);
    });
  });

  const unique = [...new Set(candidates)].slice(0, 4);
  if (unique.length === 0) {
    unique.push('Variación con mancuernas', 'Variación en máquina', 'Variación con banda');
  }

  return unique.map((name) =>
    normalizeAlternative({
      name,
      sets: current.sets,
      reps: current.reps,
      repsUnit: current.repsUnit as ExerciseAlternative['repsUnit'],
      weightUnit: current.weightUnit as ExerciseAlternative['weightUnit'],
      weight: current.weight,
      rest: current.rest,
      tips: current.tips,
      muscleGroup: muscles,
    })
  );
}

async function generateAlternativesWithGroq(
  current: {
    name: string;
    muscleGroup?: string[];
    sets?: number;
    reps?: number;
    repsUnit?: string;
    weightUnit?: string;
    weight?: number;
    rest?: string;
    tips?: string[];
    notes?: string;
  },
  otherDayExercises: string[]
): Promise<ExerciseAlternative[]> {
  const muscles = (current.muscleGroup ?? []).join(', ') || 'no especificado';
  const prompt = `
Genera alternativas de reemplazo para UN solo ejercicio de entrenamiento.
Devuelve SOLO JSON valido (sin markdown).

EJERCICIO A REEMPLAZAR:
- nombre: ${current.name}
- musculos: ${muscles}
- series: ${current.sets ?? 3}
- reps: ${current.reps ?? 10}
- unidad reps: ${current.repsUnit ?? 'count'}
- descanso (seg): ${current.rest ?? '60'}
- peso: ${current.weight ?? 0} ${current.weightUnit ?? 'kg'}
- consejos actuales: ${(current.tips ?? []).join('; ') || 'ninguno'}
- notas: ${current.notes?.trim() || 'ninguna'}

OTROS EJERCICIOS DEL MISMO DIA (no repetir estos nombres):
${otherDayExercises.length ? otherDayExercises.map((n) => `- ${n}`).join('\n') : '- ninguno'}

REGLAS:
1) Devuelve entre 3 y 4 alternativas.
2) Cada alternativa debe trabajar musculos similares al ejercicio original.
3) Mantén series/reps/descanso parecidos salvo que el ejercicio nuevo lo justifique.
4) Nombres realistas en espanol.
5) No repitas el ejercicio "${current.name}" ni los de la lista del dia.

FORMATO:
{
  "alternatives": [
    {
      "name": "string",
      "sets": 3,
      "reps": 10,
      "repsUnit": "count",
      "weightUnit": "kg",
      "weight": 0,
      "rest": "60",
      "tips": ["string"],
      "muscleGroup": ["string"]
    }
  ]
}
`.trim();

  const content = await requestGroqJson(prompt);
  if (!content) return [];
  return parseAlternativesJson(content).slice(0, 4);
}

export async function updateExerciseService(
  userId: string,
  exerciseId: string,
  updateData: unknown
): Promise<ServiceResult<unknown>> {
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

export async function deleteExerciseService(
  userId: string,
  exerciseId: string
): Promise<ServiceResult<{ id: string }>> {
  const ownsExercise = await userOwnsExercise(userId, exerciseId);
  if (!ownsExercise) return { ok: false, status: 403, message: 'No autorizado' };
  const deleted = await Exercise.findByIdAndDelete(exerciseId);
  if (!deleted) return { ok: false, status: 404, message: 'Ejercicio no encontrado' };
  await Day.updateMany({ exercises: exerciseId }, { $pull: { exercises: exerciseId } });
  return { ok: true, data: { id: exerciseId } };
}

export async function generateExercisesService(
  userId: string,
  input: GenerateExercisesInput
): Promise<ServiceResult<ExerciseAlternative[]>> {
  const ownsExercise = await userOwnsExercise(userId, input.exerciseToChangeId);
  if (!ownsExercise) return { ok: false, status: 403, message: 'No autorizado' };

  const current = await Exercise.findById(input.exerciseToChangeId).lean();
  if (!current) return { ok: false, status: 404, message: 'Ejercicio no encontrado' };

  const otherNames = (input.dayExercises ?? [])
    .filter((ex) => ex._id !== input.exerciseToChangeId)
    .map((ex) => ex.name?.trim())
    .filter((name): name is string => Boolean(name));

  let alternatives: ExerciseAlternative[] = [];

  try {
    alternatives = await generateAlternativesWithGroq(current, otherNames);
  } catch (error) {
    console.error('[generateExercises] Groq error:', error);
  }

  if (alternatives.length === 0) {
    alternatives = buildFallbackAlternatives(current, otherNames);
  }

  const currentNameLower = current.name.toLowerCase().trim();
  alternatives = alternatives
    .filter((alt) => alt.name.toLowerCase().trim() !== currentNameLower)
    .filter((alt) => !otherNames.some((n) => n.toLowerCase() === alt.name.toLowerCase().trim()))
    .slice(0, 4);

  if (alternatives.length === 0) {
    return { ok: false, status: 422, message: 'No se encontraron alternativas para este ejercicio' };
  }

  return { ok: true, data: alternatives };
}
