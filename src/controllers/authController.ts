import { Request, Response } from 'express';
import { sendError, sendSuccess } from '../utils/apiResponse';
import {
  issueResetPassword,
  loginUser,
  updatePasswordWithResetToken,
  verifyAuthToken,
} from '../services/authService';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const result = await loginUser(email, password);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Login exitoso', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error en login');
  }
};

export const verifyToken = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return sendError(res, 401, 'No se proporcionó token');
  try {
    const result = await verifyAuthToken(token);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Token válido', result.data);
  } catch (error) {
    return sendError(res, 500, 'Error en verify-token');
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return sendError(res, 400, 'Correo electrónico requerido');
  try {
    await issueResetPassword(email);
    return sendSuccess(res, 200, 'Si el correo existe, recibirás un enlace para restablecer tu contraseña');
  } catch (error) {
    return sendError(res, 500, 'Error en forgot-password');
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) return sendError(res, 400, 'Token y contraseña son requeridos');
  try {
    const result = await updatePasswordWithResetToken(token, password);
    if (!result.ok) return sendError(res, result.status, result.message);
    return sendSuccess(res, 200, 'Contraseña actualizada correctamente');
  } catch (error) {
    return sendError(res, 500, 'Error en reset-password');
  }
};
