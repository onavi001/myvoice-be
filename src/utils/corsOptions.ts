import type { CorsOptions } from 'cors';
import { APP_URL } from '../config';

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

/** Vite y otros dev servers suelen usar localhost o 127.0.0.1 en cualquier puerto. */
const LOCAL_DEV_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

/** Netlify producción y previews del sitio. */
const NETLIFY_ORIGIN =
  /^https:\/\/([a-z0-9-]+--)?myvoice-fit\.netlify\.app$/i;

function buildAllowedOrigins(): Set<string> {
  const allowed = new Set<string>([
    normalizeOrigin(APP_URL || 'http://localhost:3000'),
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'https://localhost',
    'http://localhost',
    'https://myvoice-fit.netlify.app',
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',
  ]);

  const extra = process.env.CORS_ORIGINS?.split(',') ?? [];
  for (const entry of extra) {
    const trimmed = normalizeOrigin(entry);
    if (trimmed) allowed.add(trimmed);
  }

  return allowed;
}

function isAllowedOrigin(origin: string, allowed: Set<string>): boolean {
  const normalized = normalizeOrigin(origin);
  if (allowed.has(normalized)) return true;
  if (LOCAL_DEV_ORIGIN.test(normalized)) return true;
  if (NETLIFY_ORIGIN.test(normalized)) return true;
  return false;
}

export function createCorsOptions(): CorsOptions {
  const allowed = buildAllowedOrigins();

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (isAllowedOrigin(origin, allowed)) {
        callback(null, true);
        return;
      }
      // false evita 500 sin cabeceras CORS (el navegador muestra "CORS error")
      callback(null, false);
    },
    credentials: true,
  };
}
