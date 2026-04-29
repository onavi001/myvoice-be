import { z } from 'zod';

export const progressSchema = z.object({
  routineId: z.string().min(1),
  routineName: z.string().min(1),
  dayId: z.string().min(1),
  dayName: z.string().min(1),
  exerciseId: z.string().min(1),
  exerciseName: z.string().min(1),
  sets: z.number().int().nonnegative(),
  reps: z.number().int().nonnegative(),
  repsUnit: z.enum(['count', 'seconds']).default('count'),
  weightUnit: z.enum(['kg', 'lb']).default('kg'),
  weight: z.number().nonnegative().default(0),
  notes: z.string().default(''),
  date: z.string().optional(),
  completed: z.boolean().default(false),
});

export const progressUpdateSchema = progressSchema.partial();

