/** Máximo de clientes activos por coach en plan gratuito. */
export const COACH_FREE_CLIENT_LIMIT = process.env.COACH_FREE_CLIENT_LIMIT
  ? Number(process.env.COACH_FREE_CLIENT_LIMIT)
  : 5;

export const COACH_ASSIGNMENT_MESSAGE_MAX = 500;
