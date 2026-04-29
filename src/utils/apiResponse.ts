import { Response } from 'express';

export const sendSuccess = <T>(res: Response, status: number, message: string, data?: T) =>
  res.status(status).json({
    message,
    data: data ?? null,
    error: null,
  });

export const sendError = (
  res: Response,
  status: number,
  message: string,
  error?: unknown
) =>
  res.status(status).json({
    message,
    data: null,
    error: error ?? null,
  });

