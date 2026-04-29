import mongoose from 'mongoose';
import Routine from '../models/Routine';
import Day from '../models/Day';
import Exercise from '../models/Exercise';
import User from '../models/Users';
import { runWithOptionalTransaction } from './transactionService';
import { requestGroqJson } from './groqService';

type ExerciseInput = {
  _id?: string;
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
  completed?: boolean;
  videos?: unknown[];
};

type DayInput = {
  _id?: string;
  dayName: string;
  musclesWorked?: string[];
  warmupOptions?: string[];
  explanation?: string;
  exercises?: ExerciseInput[];
};

export type RoutineGoal = 'fuerza' | 'hipertrofia' | 'resistencia';
export type RoutineLevel = 'principiante' | 'intermedio' | 'avanzado';
export type RoutineEquipment = 'gym' | 'casa' | 'pesas';

type ExerciseTemplate = {
  name: string;
  muscleGroup: string[];
  equipment: RoutineEquipment[];
  strengthSets: number;
  strengthReps: number;
  hypertrophySets: number;
  hypertrophyReps: number;
  enduranceSets: number;
  enduranceReps: number;
  tips: string[];
};

type GeneratedExercise = {
  name: string;
  muscleGroup: string[];
  sets: number;
  reps: number;
  repsUnit: 'count' | 'seconds';
  weightUnit: 'kg' | 'lb';
  weight: number;
  rest: string;
  tips: string[];
  notes?: string;
  circuitId?: string;
};

type GeneratedDay = {
  dayName: string;
  explanation: string;
  warmupOptions: string[];
  musclesWorked: string[];
  exercises: GeneratedExercise[];
};

const EXERCISE_POOL: ExerciseTemplate[] = [
  { name: 'Sentadilla', muscleGroup: ['Piernas'], equipment: ['gym', 'casa', 'pesas'], strengthSets: 5, strengthReps: 5, hypertrophySets: 4, hypertrophyReps: 10, enduranceSets: 3, enduranceReps: 15, tips: ['Mantener espalda neutra'] },
  { name: 'Peso muerto rumano', muscleGroup: ['Piernas', 'Gluteos'], equipment: ['gym', 'pesas'], strengthSets: 5, strengthReps: 5, hypertrophySets: 4, hypertrophyReps: 8, enduranceSets: 3, enduranceReps: 12, tips: ['Bisagra de cadera controlada'] },
  { name: 'Press banca', muscleGroup: ['Pecho', 'Triceps'], equipment: ['gym', 'pesas'], strengthSets: 5, strengthReps: 5, hypertrophySets: 4, hypertrophyReps: 8, enduranceSets: 3, enduranceReps: 12, tips: ['Escapulas retraidas'] },
  { name: 'Flexiones', muscleGroup: ['Pecho', 'Triceps'], equipment: ['casa'], strengthSets: 4, strengthReps: 8, hypertrophySets: 4, hypertrophyReps: 12, enduranceSets: 3, enduranceReps: 20, tips: ['Core firme durante todo el movimiento'] },
  { name: 'Remo con mancuerna', muscleGroup: ['Espalda', 'Biceps'], equipment: ['gym', 'pesas'], strengthSets: 5, strengthReps: 6, hypertrophySets: 4, hypertrophyReps: 10, enduranceSets: 3, enduranceReps: 15, tips: ['Tirar con codo, no con cuello'] },
  { name: 'Remo invertido', muscleGroup: ['Espalda', 'Biceps'], equipment: ['casa'], strengthSets: 4, strengthReps: 8, hypertrophySets: 4, hypertrophyReps: 12, enduranceSets: 3, enduranceReps: 15, tips: ['Apretar escapulas al final'] },
  { name: 'Press militar', muscleGroup: ['Hombros'], equipment: ['gym', 'pesas'], strengthSets: 5, strengthReps: 5, hypertrophySets: 4, hypertrophyReps: 10, enduranceSets: 3, enduranceReps: 14, tips: ['Evitar hiperextender la espalda'] },
  { name: 'Plancha', muscleGroup: ['Core'], equipment: ['gym', 'casa', 'pesas'], strengthSets: 4, strengthReps: 30, hypertrophySets: 4, hypertrophyReps: 40, enduranceSets: 4, enduranceReps: 50, tips: ['Respirar de forma estable'] },
  { name: 'Zancadas', muscleGroup: ['Piernas', 'Gluteos'], equipment: ['gym', 'casa', 'pesas'], strengthSets: 4, strengthReps: 8, hypertrophySets: 4, hypertrophyReps: 12, enduranceSets: 3, enduranceReps: 16, tips: ['Rodilla alineada al pie'] },
  { name: 'Curl biceps', muscleGroup: ['Biceps'], equipment: ['gym', 'pesas'], strengthSets: 4, strengthReps: 6, hypertrophySets: 4, hypertrophyReps: 12, enduranceSets: 3, enduranceReps: 15, tips: ['No balancear el torso'] },
];

function parseGroqJSONContent(content: string): { name?: string; days?: GeneratedDay[] } | null {
  const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

function normalizeGeneratedDay(day: GeneratedDay, dayIndex: number) {
  const exercises = Array.isArray(day.exercises) ? day.exercises : [];
  return {
    _id: new mongoose.Types.ObjectId().toString(),
    dayName: day.dayName?.trim() || `Dia ${dayIndex + 1}`,
    explanation: day.explanation?.trim() || '',
    warmupOptions: Array.isArray(day.warmupOptions) ? day.warmupOptions.filter(Boolean) : [],
    musclesWorked: Array.isArray(day.musclesWorked) ? day.musclesWorked.filter(Boolean) : [],
    exercises: exercises.map((exercise, exerciseIndex) => ({
      _id: new mongoose.Types.ObjectId().toString(),
      name: exercise.name?.trim() || `Ejercicio ${exerciseIndex + 1}`,
      muscleGroup: Array.isArray(exercise.muscleGroup) ? exercise.muscleGroup.filter(Boolean) : [],
      sets: Number.isFinite(exercise.sets) && exercise.sets > 0 ? exercise.sets : 3,
      reps: Number.isFinite(exercise.reps) && exercise.reps > 0 ? exercise.reps : 10,
      repsUnit: exercise.repsUnit === 'seconds' ? 'seconds' : 'count',
      weightUnit: exercise.weightUnit === 'lb' ? 'lb' : 'kg',
      weight: Number.isFinite(exercise.weight) ? exercise.weight : 0,
      rest: exercise.rest?.toString() || '60',
      tips: Array.isArray(exercise.tips) ? exercise.tips.filter(Boolean) : [],
      completed: false,
      videos: [],
      notes: exercise.notes || '',
      circuitId: exercise.circuitId || '',
    })),
  };
}

function getGoalScheme(goal: RoutineGoal, level: RoutineLevel, template: ExerciseTemplate) {
  const levelFactor = level === 'principiante' ? 0 : level === 'intermedio' ? 1 : 2;
  if (goal === 'fuerza') return { sets: Math.min(6, template.strengthSets + levelFactor), reps: Math.max(3, template.strengthReps - (levelFactor > 0 ? 1 : 0)), rest: '120', weightUnit: 'kg' as const };
  if (goal === 'resistencia') return { sets: Math.max(2, template.enduranceSets), reps: template.enduranceReps + levelFactor * 2, rest: '45', weightUnit: 'kg' as const };
  return { sets: Math.min(5, template.hypertrophySets + (level === 'avanzado' ? 1 : 0)), reps: template.hypertrophyReps, rest: '75', weightUnit: 'kg' as const };
}

function pickExercisesForDay(pool: ExerciseTemplate[], usedNames: Set<string>, count: number): ExerciseTemplate[] {
  const available = pool.filter((item) => !usedNames.has(item.name));
  const source = available.length >= count ? available : pool;
  return source.slice(0, count);
}

export async function createRoutineWithRelations(input: {
  userId: string;
  couchId?: string;
  name: string;
  days: DayInput[];
}): Promise<string> {
  const { userId, couchId, name, days } = input;

  return runWithOptionalTransaction(
    async (session) => {
      const dayIds: mongoose.Types.ObjectId[] = [];
      for (const incomingDay of days) {
        const exerciseIds: mongoose.Types.ObjectId[] = [];
        for (const incomingExercise of incomingDay.exercises || []) {
          const [exercise] = await Exercise.create([incomingExercise], { session });
          exerciseIds.push(exercise._id as mongoose.Types.ObjectId);
        }
        const [day] = await Day.create(
          [
            {
              dayName: incomingDay.dayName || 'Día',
              musclesWorked: incomingDay.musclesWorked || [],
              warmupOptions: incomingDay.warmupOptions || [],
              explanation: incomingDay.explanation || '',
              exercises: exerciseIds,
            },
          ],
          { session }
        );
        dayIds.push(day._id as mongoose.Types.ObjectId);
      }

      const [routine] = await Routine.create(
        [
          {
            userId: new mongoose.Types.ObjectId(userId),
            couchId,
            name,
            days: dayIds,
          },
        ],
        { session }
      );
      return (routine._id as mongoose.Types.ObjectId).toString();
    },
    async () => {
      const dayIds: mongoose.Types.ObjectId[] = [];
      for (const incomingDay of days) {
        const exerciseIds: mongoose.Types.ObjectId[] = [];
        for (const incomingExercise of incomingDay.exercises || []) {
          const exercise = await Exercise.create(incomingExercise);
          exerciseIds.push(exercise._id as mongoose.Types.ObjectId);
        }
        const day = await Day.create({
          dayName: incomingDay.dayName || 'Día',
          musclesWorked: incomingDay.musclesWorked || [],
          warmupOptions: incomingDay.warmupOptions || [],
          explanation: incomingDay.explanation || '',
          exercises: exerciseIds,
        });
        dayIds.push(day._id as mongoose.Types.ObjectId);
      }

      const routine = await Routine.create({
        userId: new mongoose.Types.ObjectId(userId),
        couchId,
        name,
        days: dayIds,
      });
      return (routine._id as mongoose.Types.ObjectId).toString();
    }
  );
}

export async function deleteRoutineCascade(routineId: string, dayIds: string[]): Promise<void> {
  await runWithOptionalTransaction(
    async (session) => {
      const days = await Day.find({ _id: { $in: dayIds } }).session(session).lean();
      const exerciseIds = days.flatMap((day) => (day.exercises || []).map((exerciseId) => exerciseId.toString()));
      if (exerciseIds.length > 0) {
        await Exercise.deleteMany({ _id: { $in: exerciseIds } }).session(session);
      }
      if (dayIds.length > 0) {
        await Day.deleteMany({ _id: { $in: dayIds } }).session(session);
      }
      await Routine.findByIdAndDelete(routineId).session(session);
    },
    async () => {
      const days = await Day.find({ _id: { $in: dayIds } }).lean();
      const exerciseIds = days.flatMap((day) => (day.exercises || []).map((exerciseId) => exerciseId.toString()));
      if (exerciseIds.length > 0) {
        await Exercise.deleteMany({ _id: { $in: exerciseIds } });
      }
      if (dayIds.length > 0) {
        await Day.deleteMany({ _id: { $in: dayIds } });
      }
      await Routine.findByIdAndDelete(routineId);
    }
  );
}

export async function addDayWithExercises(input: {
  routineId: string;
  dayName: string;
  musclesWorked?: string[];
  warmupOptions?: string[];
  explanation?: string;
  exercises?: ExerciseInput[];
}) {
  const { routineId, dayName, musclesWorked, warmupOptions, explanation, exercises } = input;

  return runWithOptionalTransaction(
    async (session) => {
      const exerciseIds: mongoose.Types.ObjectId[] = [];
      for (const exData of exercises || []) {
        const [exercise] = await Exercise.create([exData], { session });
        exerciseIds.push(exercise._id as mongoose.Types.ObjectId);
      }

      const [day] = await Day.create(
        [{ dayName, musclesWorked, warmupOptions, explanation, exercises: exerciseIds }],
        { session }
      );
      await Routine.findByIdAndUpdate(routineId, { $push: { days: day._id } }, { session });
      return day;
    },
    async () => {
      const exerciseIds: mongoose.Types.ObjectId[] = [];
      for (const exData of exercises || []) {
        const exercise = await Exercise.create(exData);
        exerciseIds.push(exercise._id as mongoose.Types.ObjectId);
      }
      const day = new Day({ dayName, musclesWorked, warmupOptions, explanation, exercises: exerciseIds });
      await day.save();
      await Routine.findByIdAndUpdate(routineId, { $push: { days: day._id } });
      return day;
    }
  );
}

export async function updateRoutineWithRelations(input: {
  routineId: string;
  name?: string;
  days: DayInput[];
}) {
  const { routineId, name, days } = input;
  const routine = await Routine.findById(routineId);
  if (!routine) return null;

  routine.name = name ?? routine.name;
  const nextDayIds: mongoose.Types.ObjectId[] = [];
  for (const incomingDay of days) {
    let dayDoc = incomingDay._id ? await Day.findById(incomingDay._id) : null;

    if (!dayDoc) {
      dayDoc = new Day({
        dayName: incomingDay.dayName || 'Día',
        musclesWorked: incomingDay.musclesWorked || [],
        warmupOptions: incomingDay.warmupOptions || [],
        explanation: incomingDay.explanation || '',
        exercises: [],
      });
    } else {
      dayDoc.dayName = incomingDay.dayName ?? dayDoc.dayName;
      dayDoc.musclesWorked = incomingDay.musclesWorked ?? dayDoc.musclesWorked;
      dayDoc.warmupOptions = incomingDay.warmupOptions ?? dayDoc.warmupOptions;
      dayDoc.explanation = incomingDay.explanation ?? dayDoc.explanation;
    }

    const nextExerciseIds: mongoose.Types.ObjectId[] = [];
    for (const incomingExercise of incomingDay.exercises || []) {
      let exerciseDoc = incomingExercise._id ? await Exercise.findById(incomingExercise._id) : null;
      if (!exerciseDoc) {
        exerciseDoc = new Exercise({
          name: incomingExercise.name || 'Ejercicio',
          muscleGroup: incomingExercise.muscleGroup || [],
          sets: incomingExercise.sets ?? 3,
          reps: incomingExercise.reps ?? 10,
          repsUnit: incomingExercise.repsUnit ?? 'count',
          weightUnit: incomingExercise.weightUnit ?? 'kg',
          weight: incomingExercise.weight ?? 0,
          rest: incomingExercise.rest ?? '60',
          tips: incomingExercise.tips || [],
          notes: incomingExercise.notes || '',
          circuitId: incomingExercise.circuitId || '',
          completed: incomingExercise.completed ?? false,
          videos: incomingExercise.videos || [],
        });
      } else {
        Object.assign(exerciseDoc, incomingExercise);
      }
      await exerciseDoc.save();
      nextExerciseIds.push(exerciseDoc._id as mongoose.Types.ObjectId);
    }
    dayDoc.exercises = nextExerciseIds;
    await dayDoc.save();
    nextDayIds.push(dayDoc._id as mongoose.Types.ObjectId);
  }

  routine.days = nextDayIds;
  await routine.save();
  return routine;
}

export async function generateRoutineDraft(input: {
  userId: string;
  name: string;
  goal: RoutineGoal;
  level: RoutineLevel;
  days: number;
  equipment: RoutineEquipment;
  notes: string;
}) {
  const dayCount = Math.min(7, Math.max(1, Number(input.days) || 3));
  let generatedDays: Array<ReturnType<typeof normalizeGeneratedDay>> = [];

  try {
    const prompt = `
Genera una rutina de entrenamiento en JSON estricto.
Parametros:
- nombre: ${input.name}
- objetivo: ${input.goal}
- nivel: ${input.level}
- dias: ${dayCount}
- equipo: ${input.equipment}
- notas: ${input.notes || 'sin notas'}

Reglas:
- Responde SOLO JSON valido, sin markdown.
- Estructura exacta con un objeto root y arreglo "days".
- Debe tener exactamente ${dayCount} dias.
- 4 ejercicios por dia.
`;
    const content = await requestGroqJson(prompt);
    const groqResult = content ? parseGroqJSONContent(content) : null;
    if (groqResult?.days && Array.isArray(groqResult.days) && groqResult.days.length > 0) {
      generatedDays = groqResult.days.slice(0, dayCount).map((day, index) => normalizeGeneratedDay(day, index));
    }
  } catch {
    generatedDays = [];
  }

  if (generatedDays.length === 0) {
    const filteredPool = EXERCISE_POOL.filter((item) => item.equipment.includes(input.equipment));
    const trainingPool = filteredPool.length > 0 ? filteredPool : EXERCISE_POOL;
    const usedNames = new Set<string>();
    for (let i = 0; i < dayCount; i += 1) {
      const exerciseTemplates = pickExercisesForDay(trainingPool, usedNames, 4);
      for (const template of exerciseTemplates) usedNames.add(template.name);
      const exercises = exerciseTemplates.map((template, exerciseIndex) => {
        const scheme = getGoalScheme(input.goal, input.level, template);
        return {
          name: template.name,
          muscleGroup: template.muscleGroup,
          sets: scheme.sets,
          reps: scheme.reps,
          repsUnit: input.goal === 'resistencia' && template.name === 'Plancha' ? 'seconds' : 'count',
          weightUnit: scheme.weightUnit,
          weight: input.equipment === 'casa' ? 0 : input.level === 'avanzado' ? 25 : input.level === 'intermedio' ? 15 : 8,
          rest: scheme.rest,
          tips: template.tips,
          notes: '',
          circuitId: exerciseIndex >= 2 && input.goal === 'resistencia' ? `C${i + 1}` : '',
        } as GeneratedExercise;
      });
      const musclesWorked = Array.from(new Set(exercises.flatMap((item) => item.muscleGroup)));
      generatedDays.push(
        normalizeGeneratedDay(
          {
            dayName: `Dia ${i + 1}`,
            musclesWorked,
            warmupOptions: ['Movilidad articular', 'Activacion de core'],
            explanation: `Sesion enfocada en ${input.goal} para nivel ${input.level}. ${input.notes ? `Nota: ${input.notes}` : ''}`.trim(),
            exercises,
          },
          i
        )
      );
    }
  }

  return {
    _id: new mongoose.Types.ObjectId().toString(),
    userId: input.userId,
    name: `${input.name} (${input.goal})`,
    days: generatedDays,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function populateRoutineById(routineId: string) {
  return Routine.findById(routineId).populate({
    path: 'days',
    populate: { path: 'exercises', populate: { path: 'videos' } },
  });
}

export async function listRoutinesForUser(userId: string) {
  const user = await User.findById(userId).lean();
  const query: Record<string, unknown> = { name: { $ne: null }, 'days.0': { $exists: true } };
  if (user && user.role === 'coach') {
    query.$or = [{ userId }, { couchId: userId }];
  } else {
    query.userId = userId;
  }
  return Routine.find(query)
    .populate({ path: 'days', populate: { path: 'exercises', populate: { path: 'videos' } } })
    .lean();
}

export async function getRoutineForUser(userId: string, routineId: string) {
  const routine = await populateRoutineById(routineId);
  if (!routine) return { status: 'not_found' as const };
  if (routine.userId?.toString() !== userId && routine.couchId?.toString() !== userId) {
    return { status: 'forbidden' as const };
  }
  return { status: 'ok' as const, routine };
}

export async function resetRoutineProgressForUser(userId: string, routineId: string) {
  const routine = await Routine.findById(routineId).populate({ path: 'days', populate: { path: 'exercises' } });
  if (!routine) return { status: 'not_found' as const };
  if (routine.userId?.toString() !== userId && routine.couchId?.toString() !== userId) {
    return { status: 'forbidden' as const };
  }
  const exerciseIds: string[] = [];
  for (const day of routine.days as unknown as Array<{ exercises: Array<{ _id: mongoose.Types.ObjectId }> }>) {
    for (const exercise of day.exercises || []) {
      exerciseIds.push(exercise._id.toString());
    }
  }
  if (exerciseIds.length > 0) {
    await Exercise.updateMany({ _id: { $in: exerciseIds } }, { $set: { completed: false } });
  }
  return { status: 'ok' as const };
}

