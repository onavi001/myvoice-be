import dotenv from 'dotenv';
dotenv.config();

export const MONGO_URI = process.env.MONGO_URI || '';
export const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
export const JWT_SECRET = process.env.JWT_SECRET || '';
export const APP_URL = process.env.APP_URL || 'http://localhost:3000';
export const EMAIL_USER = process.env.EMAIL_USER || '';
export const EMAIL_PASS = process.env.EMAIL_PASS || '';
export const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
export const API_RATE_LIMIT_WINDOW_MS = process.env.API_RATE_LIMIT_WINDOW_MS
  ? Number(process.env.API_RATE_LIMIT_WINDOW_MS)
  : 15 * 60 * 1000;
export const API_RATE_LIMIT_MAX = process.env.API_RATE_LIMIT_MAX
  ? Number(process.env.API_RATE_LIMIT_MAX)
  : 200;
export const AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX
  ? Number(process.env.AUTH_RATE_LIMIT_MAX)
  : 10;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}
