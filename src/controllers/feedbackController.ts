import { Request, Response } from "express";
import { sendError, sendSuccess } from "../utils/apiResponse";
import { createFeedbackSchema } from "../validators/feedbackValidators";
import {
  createFeedback,
  listAllFeedbackForAdmin,
  listMyFeedback,
} from "../services/feedbackService";

/**
 * @openapi
 * /api/feedback:
 *   post:
 *     tags: [Feedback]
 *     summary: Enviar comentario o sugerencia sobre la app
 *   get:
 *     tags: [Feedback]
 *     summary: Listar mis comentarios enviados
 */
export const postFeedback = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, "No autenticado");

  const parsed = createFeedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Datos inválidos";
    return sendError(res, 400, msg, parsed.error.flatten());
  }

  try {
    const result = await createFeedback(userId, parsed.data);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 201, "Gracias, recibimos tu mensaje", result.data);
  } catch {
    return sendError(res, 500, "No se pudo guardar tu comentario");
  }
};

export const getMyFeedback = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, "No autenticado");

  try {
    const result = await listMyFeedback(userId);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, "Tus comentarios", result.data);
  } catch {
    return sendError(res, 500, "Error al cargar comentarios");
  }
};

export const getAdminFeedback = async (req: Request, res: Response) => {
  try {
    const result = await listAllFeedbackForAdmin();
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, "Comentarios de usuarios", result.data);
  } catch {
    return sendError(res, 500, "Error al cargar comentarios");
  }
};
