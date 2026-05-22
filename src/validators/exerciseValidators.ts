import { z } from 'zod';

export const generateExercisesSchema = z.object({
  exerciseToChangeId: z.string().min(1, 'exerciseToChangeId es obligatorio'),
  dayExercises: z
    .array(
      z.object({
        _id: z.string(),
        name: z.string(),
        muscleGroup: z.array(z.string()).optional(),
        sets: z.number().optional(),
        reps: z.number().optional(),
      })
    )
    .optional(),
});

export type GenerateExercisesInput = z.infer<typeof generateExercisesSchema>;
