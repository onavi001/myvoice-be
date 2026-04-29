import dotenv from 'dotenv';
dotenv.config();

export const MONGO_URI = process.env.MONGO_URI || '';
export const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
export const JWT_SECRET = process.env.JWT_SECRET || '';
export const APP_URL = process.env.APP_URL || 'http://localhost:3000';
export const EMAIL_USER = process.env.EMAIL_USER || '';
export const EMAIL_PASS = process.env.EMAIL_PASS || '';
export const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}
