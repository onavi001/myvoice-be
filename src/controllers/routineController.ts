import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Routine from '../models/Routine';
import Day from '../models/Day';
import Exercise from '../models/Exercise';
import User from '../models/Users';
import { GROQ_API_KEY } from '../config';

function getUserIdFromRequest(req: Request): string | null {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'my-super-secret-key') as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

async function populateRoutineById(routineId: string) {
  return Routine.findById(routineId).populate({
    path: 'days',
    populate: { path: 'exercises', populate: { path: 'videos' } },
  });
}

type RoutineGoal = 'fuerza' | 'hipertrofia' | 'resistencia';
type RoutineLevel = 'principiante' | 'intermedio' | 'avanzado';
type RoutineEquipment = 'gym' | 'casa' | 'pesas';

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

function getGoalScheme(goal: RoutineGoal, level: RoutineLevel, template: ExerciseTemplate) {
  const levelFactor = level === 'principiante' ? 0 : level === 'intermedio' ? 1 : 2;
  if (goal === 'fuerza') {
    return { sets: Math.min(6, template.strengthSets + levelFactor), reps: Math.max(3, template.strengthReps - (levelFactor > 0 ? 1 : 0)), rest: '120', weightUnit: 'kg' as const };
  }
  if (goal === 'resistencia') {
    return { sets: Math.max(2, template.enduranceSets), reps: template.enduranceReps + levelFactor * 2, rest: '45', weightUnit: 'kg' as const };
  }
  return { sets: Math.min(5, template.hypertrophySets + (level === 'avanzado' ? 1 : 0)), reps: template.hypertrophyReps, rest: '75', weightUnit: 'kg' as const };
}

function pickExercisesForDay(pool: ExerciseTemplate[], usedNames: Set<string>, count: number): ExerciseTemplate[] {
  const available = pool.filter((item) => !usedNames.has(item.name));
  const source = available.length >= count ? available : pool;
  return source.slice(0, count);
}

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

function parseGroqJSONContent(content: string): { name?: string; days?: GeneratedDay[] } | null {
  const cleaned = content
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function generateRoutineWithGroq(input: {
  name: string;
  goal: RoutineGoal;
  level: RoutineLevel;
  days: number;
  equipment: RoutineEquipment;
  notes: string;
}) {
  if (!GROQ_API_KEY) return null;
  const prompt = `
Genera una rutina de entrenamiento en JSON estricto.
Parametros:
- nombre: ${input.name}
- objetivo: ${input.goal}
- nivel: ${input.level}
- dias: ${input.days}
- equipo: ${input.equipment}
- notas: ${input.notes || 'sin notas'}

Reglas:
- Responde SOLO JSON valido, sin markdown.
- Estructura exacta:
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
          "sets": 0,
          "reps": 0,
          "repsUnit": "count|seconds",
          "weightUnit": "kg|lb",
          "weight": 0,
          "rest": "string",
          "tips": ["string"],
          "notes": "string",
          "circuitId": "string"
        }
      ]
    }
  ]
}
- Debe tener exactamente ${input.days} dias.
- 4 ejercicios por dia.
`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content: 'Eres un entrenador experto. Devuelves solo JSON valido.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq request failed with status ${response.status}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') return null;
  return parseGroqJSONContent(content);
}

// GET /api/routines - Listar rutinas del usuario o coach
export const listRoutines = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  try {
    const user = await User.findById(userId).lean();
    const query: Record<string, unknown> = { name: { $ne: null }, 'days.0': { $exists: true } };
    if (user && user.role === 'coach') {
      query.$or = [{ userId }, { coachId: userId }];
    } else {
      query.userId = userId;
    }
    const routines = await Routine.find(query)
      .populate({ path: 'days', populate: { path: 'exercises', populate: { path: 'videos' } } })
      .lean();
    res.status(200).json(routines);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener rutinas', error });
  }
};

// GET /api/routines/:routineId - Obtener rutina por ID
export const getRoutine = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { routineId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(routineId)) {
    return res.status(400).json({ message: 'ID de rutina inválido' });
  }
  try {
    const routine = await populateRoutineById(routineId);
    if (!routine) return res.status(404).json({ message: 'Rutina no encontrada' });
    res.status(200).json(routine);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener rutina', error });
  }
};

// PUT /api/routines/:routineId - Actualizar rutina
export const updateRoutine = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { routineId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(routineId)) {
    return res.status(400).json({ message: 'ID de rutina inválido' });
  }
  try {
    const { routineData } = req.body;
    if (!routineData || !Array.isArray(routineData.days)) {
      return res.status(400).json({ message: 'Datos de rutina inválidos' });
    }
    const routine = await Routine.findById(routineId);
    if (!routine) return res.status(404).json({ message: 'Rutina no encontrada' });
    routine.name = routineData.name ?? routine.name;
    const nextDayIds: mongoose.Types.ObjectId[] = [];
    for (const incomingDay of routineData.days) {
      let dayDoc;
      if (incomingDay._id) {
        dayDoc = await Day.findById(incomingDay._id);
      }
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
        let exerciseDoc;
        if (incomingExercise._id) {
          exerciseDoc = await Exercise.findById(incomingExercise._id);
        }
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
    const updatedRoutine = await populateRoutineById(routineId);
    res.status(200).json(updatedRoutine);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar rutina', error });
  }
};

// POST /api/routines - Crear rutina
export const createRoutine = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  try {
    const { name, days = [] } = req.body;
    if (!name) return res.status(400).json({ message: 'El nombre de la rutina es obligatorio' });
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
      couchId: req.body.couchId,
      name,
      days: dayIds,
    });
    const populatedRoutine = await populateRoutineById((routine._id as mongoose.Types.ObjectId).toString());
    res.status(201).json(populatedRoutine);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear rutina', error });
  }
};

// DELETE /api/routines/:routineId - Eliminar rutina
export const deleteRoutine = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { routineId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(routineId)) {
    return res.status(400).json({ message: 'ID de rutina inválido' });
  }
  try {
    const routine = await Routine.findById(routineId).lean();
    if (!routine) return res.status(404).json({ message: 'Rutina no encontrada' });
    const dayIds = (routine.days || []).map((dayId) => dayId.toString());
    const days = await Day.find({ _id: { $in: dayIds } }).lean();
    const exerciseIds = days.flatMap((day) => (day.exercises || []).map((exerciseId) => exerciseId.toString()));
    if (exerciseIds.length > 0) {
      await Exercise.deleteMany({ _id: { $in: exerciseIds } });
    }
    if (dayIds.length > 0) {
      await Day.deleteMany({ _id: { $in: dayIds } });
    }
    await Routine.findByIdAndDelete(routineId);
    res.status(200).json({ message: 'Rutina eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar rutina', error });
  }
};

// PUT /api/routines/:routineId/reset - Reiniciar progreso de rutina
export const resetRoutineProgress = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { routineId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(routineId)) {
    return res.status(400).json({ message: 'ID de rutina inválido' });
  }
  try {
    const routine = await Routine.findById(routineId).populate({ path: 'days', populate: { path: 'exercises' } });
    if (!routine) return res.status(404).json({ message: 'Rutina no encontrada' });
    const exerciseIds: string[] = [];
    for (const day of routine.days as unknown as Array<{ exercises: Array<{ _id: mongoose.Types.ObjectId }> }>) {
      for (const exercise of day.exercises || []) {
        exerciseIds.push(exercise._id.toString());
      }
    }
    if (exerciseIds.length > 0) {
      await Exercise.updateMany({ _id: { $in: exerciseIds } }, { $set: { completed: false } });
    }
    res.status(200).json({ message: 'Progreso de rutina reiniciado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al reiniciar rutina', error });
  }
};

// POST /api/routines/generate - Generar rutina base
export const generateRoutine = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  try {
    const {
      name = 'Rutina IA',
      goal = 'hipertrofia',
      level = 'intermedio',
      days = 3,
      equipment = 'gym',
      notes = '',
    } = req.body as {
      name?: string;
      goal?: RoutineGoal;
      level?: RoutineLevel;
      days?: number;
      equipment?: RoutineEquipment;
      notes?: string;
    };

    const dayCount = Math.min(7, Math.max(1, Number(days) || 3));
    let generatedDays: Array<ReturnType<typeof normalizeGeneratedDay>> = [];
    try {
      const groqResult = await generateRoutineWithGroq({
        name,
        goal,
        level,
        days: dayCount,
        equipment,
        notes,
      });
      if (groqResult?.days && Array.isArray(groqResult.days) && groqResult.days.length > 0) {
        generatedDays = groqResult.days.slice(0, dayCount).map((day, index) => normalizeGeneratedDay(day, index));
      }
    } catch {
      generatedDays = [];
    }

    // Fallback heuristico si Groq falla o devuelve formato invalido.
    if (generatedDays.length === 0) {
      const filteredPool = EXERCISE_POOL.filter((item) => item.equipment.includes(equipment));
      const trainingPool = filteredPool.length > 0 ? filteredPool : EXERCISE_POOL;
      const usedNames = new Set<string>();
      for (let i = 0; i < dayCount; i += 1) {
        const exerciseTemplates = pickExercisesForDay(trainingPool, usedNames, 4);
        for (const template of exerciseTemplates) {
          usedNames.add(template.name);
        }
        const exercises = exerciseTemplates.map((template, exerciseIndex) => {
          const scheme = getGoalScheme(goal, level, template);
          return {
            name: template.name,
            muscleGroup: template.muscleGroup,
            sets: scheme.sets,
            reps: scheme.reps,
            repsUnit: goal === 'resistencia' && template.name === 'Plancha' ? 'seconds' : 'count',
            weightUnit: scheme.weightUnit,
            weight: equipment === 'casa' ? 0 : level === 'avanzado' ? 25 : level === 'intermedio' ? 15 : 8,
            rest: scheme.rest,
            tips: template.tips,
            notes: '',
            circuitId: exerciseIndex >= 2 && goal === 'resistencia' ? `C${i + 1}` : '',
          } as GeneratedExercise;
        });
        const musclesWorked = Array.from(new Set(exercises.flatMap((item) => item.muscleGroup)));
        generatedDays.push(
          normalizeGeneratedDay(
            {
              dayName: `Dia ${i + 1}`,
              musclesWorked,
              warmupOptions: ['Movilidad articular', 'Activacion de core'],
              explanation: `Sesion enfocada en ${goal} para nivel ${level}. ${notes ? `Nota: ${notes}` : ''}`.trim(),
              exercises,
            },
            i
          )
        );
      }
    }

    res.status(200).json({
      _id: new mongoose.Types.ObjectId().toString(),
      userId,
      name: `${name} (${goal})`,
      days: generatedDays,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al generar rutina', error });
  }
};

// POST /api/routines/:routineId/days - Agregar día a rutina
export const addDayToRoutine = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { routineId } = req.params;
  try {
    const { dayName, musclesWorked, warmupOptions, explanation, exercises } = req.body;
    const exerciseIds = [];
    for (const exData of exercises || []) {
      const exercise = new Exercise(exData);
      await exercise.save();
      exerciseIds.push(exercise._id);
    }
    const day = new Day({ dayName, musclesWorked, warmupOptions, explanation, exercises: exerciseIds });
    await day.save();
    await Routine.findByIdAndUpdate(routineId, { $push: { days: day._id } });
    res.status(201).json(day);
  } catch (error) {
    res.status(500).json({ message: 'Error al agregar día', error });
  }
};
