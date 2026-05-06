import { Router } from 'express';
import mongoose from 'mongoose';
import Progress from '../models/Progress';
import Routine from '../models/Routine';
import { requireAuth } from '../middleware/auth';
import { requestGroqText } from '../services/groqService';

const router = Router();
const MAX_PROMPT_LENGTH = 500;
const MAX_HISTORY_ITEMS = 3;

type ChatHistoryItem = {
  query: string;
  response: string;
};

const CHATBOT_SYSTEM_INSTRUCTION =
  'Eres MyVoice AI, un coach de entrenamiento y salud. Responde siempre en espanol, con tono cercano, claro y practico. ' +
  'Usa este formato exacto: ' +
  '1) "Respuesta corta" (1-2 frases). ' +
  '2) "Puntos clave" en 3-5 bullets cortos y accionables. ' +
  '3) "Plan de accion (3 pasos)" con tres pasos numerados para aplicar hoy. ' +
  'Por defecto enfoca la respuesta en el dia actual de la rutina activa. ' +
  'Solo habla de otros dias o de toda la rutina si el usuario lo pide de forma explicita. ' +
  'Si el usuario pregunta sobre tecnica, incluye una correccion comun a evitar. ' +
  'Si detectas posible lesion o dolor intenso, recomienda pausar y consultar a un profesional de salud. ' +
  'No inventes datos medicos ni diagnosticos.';

router.use(requireAuth);

const normalizeHistory = (history: unknown): ChatHistoryItem[] => {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof (item as ChatHistoryItem).query === 'string' &&
        typeof (item as ChatHistoryItem).response === 'string'
    )
    .slice(-MAX_HISTORY_ITEMS);
};

const getTodayBounds = () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const formatRoutineContext = async (routineId: string, userId: string): Promise<string> => {
  const routine = await Routine.findOne({
    _id: routineId,
    $or: [{ userId }, { couchId: userId }],
  })
    .populate({
      path: 'days',
      select: 'dayName musclesWorked exercises',
      populate: {
        path: 'exercises',
        select: 'name muscleGroup sets reps repsUnit rest completed',
      },
    })
    .lean();

  if (!routine) return 'Sin rutina activa encontrada para este usuario.';

  const days = Array.isArray(routine.days) ? routine.days : [];
  const daySummaries = days.map((day, dayIndex) => {
    const safeDay = day as {
      dayName?: string;
      musclesWorked?: string[];
      exercises?: Array<{
        name?: string;
        muscleGroup?: string[];
        sets?: number;
        reps?: number;
        repsUnit?: string;
        rest?: string;
        completed?: boolean;
      }>;
    };

    const dayName = safeDay.dayName || `Dia ${dayIndex + 1}`;
    const musclesWorked = (safeDay.musclesWorked || []).join(', ') || 'No especificado';
    const exercises = (safeDay.exercises || []).slice(0, 6);
    const exerciseSummary =
      exercises.length > 0
        ? exercises
            .map((exercise) => {
              const name = exercise.name || 'Ejercicio sin nombre';
              const muscleGroup = (exercise.muscleGroup || []).join('/') || 'sin grupo';
              const sets = exercise.sets ?? 0;
              const reps = exercise.reps ?? 0;
              const repsUnit = exercise.repsUnit || 'count';
              const rest = exercise.rest || 'sin descanso';
              const status = exercise.completed ? 'completado' : 'pendiente';
              return `${name} (${muscleGroup}) ${sets}x${reps} ${repsUnit}, descanso ${rest}, ${status}`;
            })
            .join('; ')
        : 'Sin ejercicios';

    return `${dayName}: Musculos ${musclesWorked}. Ejercicios: ${exerciseSummary}.`;
  });

  const { start, end } = getTodayBounds();
  const todayProgress = await Progress.find({
    userId,
    routineId,
    date: { $gte: start, $lte: end },
  })
    .select('dayId dayName')
    .lean();

  const todayCounts = new Map<string, { dayName: string; count: number }>();
  for (const entry of todayProgress) {
    const dayId = String(entry.dayId);
    const current = todayCounts.get(dayId);
    if (current) {
      current.count += 1;
    } else {
      todayCounts.set(dayId, { dayName: entry.dayName, count: 1 });
    }
  }

  let currentDayContext = '';
  let currentDayName = '';
  let currentDaySummary = '';
  if (todayCounts.size > 0) {
    const mostActiveDay = Array.from(todayCounts.values()).sort((a, b) => b.count - a.count)[0];
    currentDayName = mostActiveDay.dayName;
    currentDayContext = `Dia actual detectado por progreso de hoy: ${currentDayName}.`;
  } else if (days.length > 0) {
    const weekdayIndex = new Date().getDay(); // 0 domingo ... 6 sabado
    const mappedIndex = (weekdayIndex + 6) % 7; // lunes = 0
    const dayPosition = mappedIndex % days.length;
    const fallbackDay = days[dayPosition] as { dayName?: string };
    currentDayName = fallbackDay.dayName || `Dia ${dayPosition + 1}`;
    currentDayContext = `Dia actual sugerido por calendario: ${currentDayName}.`;
  } else {
    currentDayContext = 'No fue posible determinar el dia actual porque la rutina no tiene dias.';
  }

  if (currentDayName) {
    const matchedSummary = daySummaries.find((summary) => summary.startsWith(`${currentDayName}:`));
    if (matchedSummary) {
      currentDaySummary = matchedSummary;
    }
  }

  return (
    `Rutina activa: ${routine.name}. ${currentDayContext} ` +
    `Resumen del dia actual: ${currentDaySummary || 'No hay detalle del dia actual.'} ` +
    `Contexto extra (usar solo si el usuario lo pide): ${daySummaries.join(' ')}`
  );
};

router.post('/', async (req, res) => {
  try {
    const { prompt, selectedRoutineId, chatHistory } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt inválido' });
    }

    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      return res.status(400).json({ error: 'Prompt inválido' });
    }

    if (normalizedPrompt.length > MAX_PROMPT_LENGTH) {
      return res.status(400).json({ error: `Prompt demasiado largo (máximo ${MAX_PROMPT_LENGTH} caracteres)` });
    }

    const safeHistory = normalizeHistory(chatHistory);
    const historyContext =
      safeHistory.length > 0
        ? safeHistory
            .map(
              (item, index) =>
                `Contexto ${index + 1} - Usuario: ${item.query}\nContexto ${index + 1} - AI: ${item.response}`
            )
            .join('\n')
        : 'Sin historial reciente.';

    const routineContext =
      typeof selectedRoutineId === 'string' &&
      mongoose.Types.ObjectId.isValid(selectedRoutineId) &&
      req.userId
        ? await formatRoutineContext(selectedRoutineId, req.userId)
        : 'Sin rutina activa seleccionada.';

    const composedPrompt =
      `Pregunta del usuario: ${normalizedPrompt}\n\n` +
      `Historial reciente:\n${historyContext}\n\n` +
      `Contexto de rutina:\n${routineContext}`;

    const groqContent = await requestGroqText(composedPrompt, CHATBOT_SYSTEM_INSTRUCTION);
    const content =
      groqContent?.trim() ||
      'No pude generar una respuesta en este momento. Intenta de nuevo en unos segundos.';

    return res.status(200).json({
      content,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al procesar chatbot' });
  }
});

export default router;
