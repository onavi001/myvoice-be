import { z } from 'zod';

const exerciseInputSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1).optional(),
  muscleGroup: z.array(z.string()).optional(),
  sets: z.number().int().nonnegative().optional(),
  reps: z.number().int().nonnegative().optional(),
  repsUnit: z.enum(['count', 'seconds']).optional(),
  weightUnit: z.enum(['kg', 'lb']).optional(),
  weight: z.number().nonnegative().optional(),
  rest: z.string().optional(),
  tips: z.array(z.string()).optional(),
  notes: z.string().optional(),
  circuitId: z.string().optional(),
  completed: z.boolean().optional(),
  videos: z.array(z.any()).optional(),
});

const dayInputSchema = z.object({
  _id: z.string().optional(),
  dayName: z.string().min(1),
  musclesWorked: z.array(z.string()).default([]),
  warmupOptions: z.array(z.string()).default([]),
  explanation: z.string().default(''),
  exercises: z.array(exerciseInputSchema).default([]),
});

export const createRoutineSchema = z.object({
  name: z.string().min(1),
  couchId: z.string().optional(),
  days: z.array(dayInputSchema).default([]),
});

export const updateRoutineSchema = z.object({
  routineData: z.object({
    name: z.string().min(1).optional(),
    days: z.array(dayInputSchema),
  }),
});

