import mongoose from 'mongoose';
import Routine from '../models/Routine';
import Day from '../models/Day';
import Exercise from '../models/Exercise';
import User from '../models/Users';
import { runWithOptionalTransaction } from './transactionService';
import { GROQ_API_KEY } from '../config';
import { requestGroqJson, requestGroqJsonWithVision } from './groqService';
import { buildSessionExercisePlan, type SessionPlanResult } from './routineExercisePlan';

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

  const tryParse = (raw: string) => {
    try {
      return JSON.parse(raw) as { name?: string; days?: GeneratedDay[] };
    } catch {
      return null;
    }
  };

  const direct = tryParse(cleaned);
  if (direct?.days && Array.isArray(direct.days)) return direct;

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    const sliced = tryParse(cleaned.slice(start, end + 1));
    if (sliced?.days && Array.isArray(sliced.days)) return sliced;
  }

  return null;
}

function daysFromGroqContent(content: string | null): Array<ReturnType<typeof normalizeGeneratedDay>> {
  if (!content) return [];
  const groqResult = parseGroqJSONContent(content);
  if (!groqResult?.days || !Array.isArray(groqResult.days) || groqResult.days.length === 0) {
    return [];
  }
  return groqResult.days.map((day, index) => normalizeGeneratedDay(day, index));
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

function buildRoutineGenerationPrompt(input: {
  name: string;
  goal: RoutineGoal;
  level: RoutineLevel;
  dayCount: number;
  equipment: RoutineEquipment;
  notes: string;
  biologicalSex: 'masculino' | 'femenino';
  heightCm: number;
  weightKg: number;
  sessionDurationMin: number;
  sessionPlan: SessionPlanResult;
}) {
  const { sessionPlan } = input;
  const exercisesPerDay = sessionPlan.exercisesPerDay;

  return `
Genera una rutina de entrenamiento personalizada en ESPANOL y devuelve SOLO JSON valido (sin markdown ni texto adicional).
La rutina debe ser util para mantenerse varias semanas, no solo para una sesion aislada.

DATOS DEL USUARIO (debes respetarlos estrictamente):
- nombreRutina: ${input.name}
- sexoBiologico: ${input.biologicalSex}
- alturaCm: ${input.heightCm}
- pesoKg: ${input.weightKg}
- imc: ${sessionPlan.bmi}
- categoriaComposicionCorporal: ${sessionPlan.bmiCategory}
- tiempoDisponibleMin: ${input.sessionDurationMin}
- objetivo: ${input.goal}
- nivel: ${input.level}
- diasSolicitados: ${input.dayCount}
- equipoDisponible: ${input.equipment}
- notasUsuario: ${input.notes || 'sin notas'}
- ejerciciosPorDia: ${exercisesPerDay}
- minutosEstimadosPorEjercicio: ~${sessionPlan.minutesPerExercise.toFixed(1)}
- criterioEjerciciosPorDia: ${sessionPlan.planRationale}

REGLAS DE CONSISTENCIA:
1) Debe haber exactamente ${input.dayCount} dias.
2) Cada dia debe tener exactamente ${exercisesPerDay} ejercicios. Este numero ya fue calculado con tiempo (${input.sessionDurationMin} min), sexo biologico, altura, peso, IMC, objetivo, nivel y equipo; NO agregues ni quites ejercicios.
3) Los ejercicios deben ser compatibles con equipo "${input.equipment}".
4) Ajusta series, repeticiones y descansos al nivel "${input.level}" y objetivo "${input.goal}" de forma que la sesion completa (incluye calentamiento) quepa en ${input.sessionDurationMin} min con ${exercisesPerDay} ejercicios (~${sessionPlan.minutesPerExercise.toFixed(1)} min por ejercicio).
5) Evita repetir el mismo ejercicio en dias consecutivos; busca variedad de patrones.
6) Incluye musculosWorked coherente con los ejercicios del dia.
7) warmupOptions debe incluir 2-3 opciones practicas acordes al nivel y composicion corporal.
8) explanation debe mencionar brevemente como se adapto la rutina al perfil (tiempo, objetivo, nivel, datos corporales).
9) Usa nombres de ejercicios realistas y comunes.
10) repsUnit debe ser "count" o "seconds"; weightUnit debe ser "kg" o "lb".
11) rest debe ser string numerico en segundos (ejemplo: "60", "90", "120").
12) Pesos iniciales (kg): calibra con peso corporal ${input.weightKg} kg, altura ${input.heightCm} cm, sexo biologico ${input.biologicalSex} y nivel ${input.level}. Principiante o IMC alto: cargas conservadoras y tecnica; avanzado con IMC normal: progresion mas ambiciosa si aplica. Usa 0 solo en peso corporal o sin carga externa.
13) Si categoriaComposicionCorporal es sobrepeso u obesidad, o nivel principiante, prioriza ejercicios seguros, descansos algo mas largos y menos fatiga articular antes de subir volumen.
14) El sexo biologico influye en recuperacion y cargas relativas; ajusta sin estereotipos ni lenguaje ofensivo.

REGLAS DE VARIEDAD:
- Distribuye patrones de movimiento (empuje, tiron, pierna, core) a lo largo de la semana.
- Alterna enfoque muscular por dia para no saturar los mismos grupos siempre.
- Si objetivo es resistencia, prioriza descansos mas cortos y algun bloque tipo circuito (circuitId cuando aplique).
- Si objetivo es fuerza, prioriza menos repeticiones y descansos mas largos; con ${exercisesPerDay} ejercicios no satures la sesion.
- Si objetivo es hipertrofia, usa volumen moderado-alto con tecnica controlada acorde al tiempo disponible.
- Si hay notas sobre lesiones o limitaciones, evita variantes agresivas y propone opciones seguras.

FORMATO JSON OBLIGATORIO:
{
  "name": "string",
  "days": [
    {
      "dayName": "string",
      "explanation": "string",
      "warmupOptions": ["string", "string"],
      "musclesWorked": ["string", "string"],
      "exercises": [
        {
          "name": "string",
          "muscleGroup": ["string"],
          "sets": 3,
          "reps": 10,
          "repsUnit": "count",
          "weightUnit": "kg",
          "weight": 0,
          "rest": "60",
          "tips": ["string"],
          "notes": "",
          "circuitId": ""
        }
      ]
    }
  ]
}
`.trim();
}

function completeGeneratedDays(
  partialDays: Array<ReturnType<typeof normalizeGeneratedDay>>,
  dayCount: number,
  exercisesPerDay: number,
  input: { goal: RoutineGoal; level: RoutineLevel; equipment: RoutineEquipment; notes: string }
) {
  const filteredPool = EXERCISE_POOL.filter((item) => item.equipment.includes(input.equipment));
  const trainingPool = filteredPool.length > 0 ? filteredPool : EXERCISE_POOL;
  const usedNames = new Set<string>();
  partialDays.forEach((day) => day.exercises.forEach((exercise) => usedNames.add(exercise.name)));

  const completedDays = [...partialDays];

  for (let i = 0; i < completedDays.length; i += 1) {
    const day = completedDays[i];
    if (day.exercises.length < exercisesPerDay) {
      const missing = exercisesPerDay - day.exercises.length;
      const extraTemplates = pickExercisesForDay(trainingPool, usedNames, missing);
      const extraExercises = extraTemplates.map((template, index) => {
        usedNames.add(template.name);
        const scheme = getGoalScheme(input.goal, input.level, template);
        return {
          _id: new mongoose.Types.ObjectId().toString(),
          name: template.name,
          muscleGroup: template.muscleGroup,
          sets: scheme.sets,
          reps: scheme.reps,
          repsUnit: input.goal === 'resistencia' && template.name === 'Plancha' ? ('seconds' as const) : ('count' as const),
          weightUnit: scheme.weightUnit,
          weight: input.equipment === 'casa' ? 0 : input.level === 'avanzado' ? 25 : input.level === 'intermedio' ? 15 : 8,
          rest: scheme.rest,
          tips: template.tips,
          completed: false,
          videos: [],
          notes: '',
          circuitId: day.exercises.length + index >= 2 && input.goal === 'resistencia' ? `C${i + 1}` : '',
        };
      });
      day.exercises = [...day.exercises, ...extraExercises].slice(0, exercisesPerDay);
      day.musclesWorked = Array.from(new Set(day.exercises.flatMap((exercise) => exercise.muscleGroup)));
    } else if (day.exercises.length > exercisesPerDay) {
      day.exercises = day.exercises.slice(0, exercisesPerDay);
      day.musclesWorked = Array.from(new Set(day.exercises.flatMap((exercise) => exercise.muscleGroup)));
    }
  }

  for (let i = completedDays.length; i < dayCount; i += 1) {
    const exerciseTemplates = pickExercisesForDay(trainingPool, usedNames, exercisesPerDay);
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
    completedDays.push(
      normalizeGeneratedDay(
        {
          dayName: `Dia ${i + 1}`,
          musclesWorked: Array.from(new Set(exercises.flatMap((item) => item.muscleGroup))),
          warmupOptions: ['Movilidad articular', 'Activacion de core'],
          explanation: `Sesion enfocada en ${input.goal} para nivel ${input.level}. ${input.notes ? `Nota: ${input.notes}` : ''}`.trim(),
          exercises,
        },
        i
      )
    );
  }

  return completedDays.slice(0, dayCount);
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

export type BiologicalSex = 'masculino' | 'femenino';

export async function generateRoutineDraft(input: {
  userId: string;
  name: string;
  goal: RoutineGoal;
  level: RoutineLevel;
  days: number;
  equipment: RoutineEquipment;
  notes: string;
  biologicalSex?: BiologicalSex;
  heightCm?: number;
  weightKg?: number;
  sessionDurationMin?: number;
}) {
  const dayCount = Math.min(7, Math.max(1, Number(input.days) || 3));
  const sessionDurationMin = Math.min(180, Math.max(20, Number(input.sessionDurationMin) || 60));
  const heightCm = Math.min(230, Math.max(120, Number(input.heightCm) || 170));
  const weightKg = Math.min(250, Math.max(30, Number(input.weightKg) || 70));
  const biologicalSex: BiologicalSex =
    input.biologicalSex === 'femenino' ? 'femenino' : 'masculino';
  const sessionPlan = buildSessionExercisePlan({
    sessionDurationMin,
    goal: input.goal,
    level: input.level,
    equipment: input.equipment,
    heightCm,
    weightKg,
    biologicalSex,
  });
  const perDay = sessionPlan.exercisesPerDay;
  let generatedDays: Array<ReturnType<typeof normalizeGeneratedDay>> = [];

  try {
    const prompt = buildRoutineGenerationPrompt({
      name: input.name,
      goal: input.goal,
      level: input.level,
      dayCount,
      equipment: input.equipment,
      notes: input.notes,
      biologicalSex,
      heightCm,
      weightKg,
      sessionDurationMin,
      sessionPlan,
    });
    const content = await requestGroqJson(prompt);
    const groqResult = content ? parseGroqJSONContent(content) : null;
    if (groqResult?.days && Array.isArray(groqResult.days) && groqResult.days.length > 0) {
      generatedDays = groqResult.days.slice(0, dayCount).map((day, index) => normalizeGeneratedDay(day, index));
      generatedDays = completeGeneratedDays(generatedDays, dayCount, perDay, {
        goal: input.goal,
        level: input.level,
        equipment: input.equipment,
        notes: input.notes,
      });
    }
  } catch {
    generatedDays = [];
  }

  if (generatedDays.length === 0) {
    const filteredPool = EXERCISE_POOL.filter((item) => item.equipment.includes(input.equipment));
    const trainingPool = filteredPool.length > 0 ? filteredPool : EXERCISE_POOL;
    const usedNames = new Set<string>();
    for (let i = 0; i < dayCount; i += 1) {
      const exerciseTemplates = pickExercisesForDay(trainingPool, usedNames, perDay);
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

function buildRoutineImportPrompt(input: {
  name: string;
  notes: string;
  extractedText: string;
  imageCount: number;
}) {
  return `
Analiza el material adjunto (imagenes y/o texto extraido de documentos) y reconstruye la rutina de entrenamiento en ESPANOL.
Devuelve SOLO JSON valido (sin markdown ni texto adicional).

CONTEXTO:
- nombreSugerido: ${input.name || 'Rutina importada'}
- notasUsuario: ${input.notes || 'sin notas'}
- cantidadImagenes: ${input.imageCount}
- textoExtraidoDocumentos:
"""
${input.extractedText || 'sin texto extraido'}
"""

INSTRUCCIONES:
1) Extrae todos los dias y ejercicios que aparezcan en el material. No inventes dias que no esten.
2) Si el material tiene menos detalle en algun ejercicio, completa con valores razonables (sets, reps, rest).
3) Conserva nombres de ejercicios lo mas fieles posible al documento/foto.
4) warmupOptions: 2-3 opciones si el documento no las trae.
5) musclesWorked coherente con ejercicios del dia.
6) repsUnit: "count" o "seconds"; weightUnit: "kg" o "lb"; rest en segundos como string ("60", "90").
7) Cada dia debe tener al menos 1 ejercicio; si hay muchos, incluye todos los listados.
8) "name" del JSON: titulo corto de la rutina detectada o el nombre sugerido.

FORMATO JSON OBLIGATORIO:
{
  "name": "string",
  "days": [
    {
      "dayName": "string",
      "explanation": "string",
      "warmupOptions": ["string"],
      "musclesWorked": ["string"],
      "exercises": [
        {
          "name": "string",
          "muscleGroup": ["string"],
          "sets": 3,
          "reps": 10,
          "repsUnit": "count",
          "weightUnit": "kg",
          "weight": 0,
          "rest": "60",
          "tips": ["string"],
          "notes": "",
          "circuitId": ""
        }
      ]
    }
  ]
}
`.trim();
}

export async function generateRoutineFromImport(input: {
  userId: string;
  name?: string;
  notes?: string;
  extractedText?: string;
  images?: string[];
}) {
  const images = (input.images ?? []).filter((url) => typeof url === 'string' && url.startsWith('data:image/'));
  const extractedText = (input.extractedText ?? '').trim().slice(0, 50000);
  const notes = (input.notes ?? '').trim();
  const name = (input.name ?? 'Rutina importada').trim() || 'Rutina importada';

  const hasUsefulText =
    extractedText.length > 80 &&
    !extractedText.includes('PDF sin texto legible') &&
    !extractedText.includes('sin texto extraido');

  if (images.length === 0 && !hasUsefulText) {
    throw new Error('Se requiere al menos una imagen o texto legible del documento');
  }

  if (!GROQ_API_KEY) {
    throw new Error('El servidor no tiene configurada la clave de IA (GROQ_API_KEY)');
  }

  const prompt = buildRoutineImportPrompt({
    name,
    notes,
    extractedText: hasUsefulText ? extractedText : '',
    imageCount: images.length,
  });

  let generatedDays: Array<ReturnType<typeof normalizeGeneratedDay>> = [];
  let detectedName = name;

  // 1) Imagenes / capturas (vision)
  if (images.length > 0) {
    try {
      const content = await requestGroqJsonWithVision(prompt, images);
      generatedDays = daysFromGroqContent(content);
      const parsed = content ? parseGroqJSONContent(content) : null;
      if (parsed?.name?.trim()) detectedName = parsed.name.trim();
      if (generatedDays.length === 0 && content) {
        console.error('[import] Vision devolvio contenido sin dias parseables:', content.slice(0, 400));
      }
    } catch (error) {
      console.error('[import] Error en vision:', error);
    }
  }

  // 2) Fallback: texto del PDF/documento
  if (generatedDays.length === 0 && hasUsefulText) {
    try {
      const textPrompt = `${prompt}

IMPORTANTE: No hay imagenes adjuntas. Usa UNICAMENTE el texto extraido del documento para reconstruir la rutina.`;
      const content = await requestGroqJson(textPrompt);
      generatedDays = daysFromGroqContent(content);
      const parsed = content ? parseGroqJSONContent(content) : null;
      if (parsed?.name?.trim()) detectedName = parsed.name.trim();
      if (generatedDays.length === 0 && content) {
        console.error('[import] Texto devolvio contenido sin dias parseables:', content.slice(0, 400));
      }
    } catch (error) {
      console.error('[import] Error en texto:', error);
    }
  }

  // 3) Imagenes + texto util: segundo intento combinando ambos en prompt de texto
  if (generatedDays.length === 0 && images.length > 0 && hasUsefulText) {
    try {
      const hybridPrompt = `${prompt}

Tambien dispones de este texto OCR/extraido del mismo material:
"""
${extractedText}
"""
Combina imagen y texto para maximizar precision.`;
      const content = await requestGroqJsonWithVision(hybridPrompt, images);
      generatedDays = daysFromGroqContent(content);
      const parsed = content ? parseGroqJSONContent(content) : null;
      if (parsed?.name?.trim()) detectedName = parsed.name.trim();
    } catch (error) {
      console.error('[import] Error en hibrido vision+texto:', error);
    }
  }

  if (generatedDays.length === 0) {
    throw new Error(
      images.length > 0 && !hasUsefulText
        ? 'No se pudo leer la rutina en las imagenes. Prueba capturas mas nitidas o un PDF con texto seleccionable.'
        : 'No se pudo interpretar la rutina del archivo. Prueba con fotos mas claras o otro documento.'
    );
  }

  return {
    _id: new mongoose.Types.ObjectId().toString(),
    userId: input.userId,
    name: detectedName || 'Rutina importada',
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

