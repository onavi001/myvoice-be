import type { CorsOptions } from 'cors';
import { APP_URL } from '../config';

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

function buildAllowedOrigins(): Set<string> {
  const allowed = new Set<string>([
    normalizeOrigin(APP_URL || 'http://localhost:3000'),
    'http://localhost:5173',
    'http://localhost:3000',
    'https://localhost',
    'http://localhost',
    'capacitor://localhost',
  ]);

  const extra = process.env.CORS_ORIGINS?.split(',') ?? [];
  for (const entry of extra) {
    const trimmed = normalizeOrigin(entry);
    if (trimmed) allowed.add(trimmed);
  }

  return allowed;
}

export function createCorsOptions(): CorsOptions {
  const allowed = buildAllowedOrigins();

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalized = normalizeOrigin(origin);
      if (allowed.has(normalized)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS: origen no permitido (${origin})`));
    },
    credentials: true,
  };
}
