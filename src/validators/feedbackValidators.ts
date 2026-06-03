import { z } from "zod";

export const createFeedbackSchema = z.object({
  category: z.enum(["idea", "bug", "help", "praise", "other"]),
  message: z
    .string()
    .trim()
    .min(10, "Escribe al menos 10 caracteres")
    .max(2000, "Máximo 2000 caracteres"),
  rating: z.number().int().min(1).max(5).optional(),
  platform: z.string().max(32).optional(),
  appVersion: z.string().max(32).optional(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
