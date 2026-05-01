import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err);
  const status = typeof err?.status === 'number' ? err.status : 500;
  const message = typeof err?.message === 'string' && status < 500
    ? err.message
    : 'Internal Server Error';
  const includeDetails = process.env.NODE_ENV !== 'production';

  res.status(status).json({
    message,
    data: null,
    error: includeDetails ? (err?.details ?? null) : null,
  });
}
