import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/Users';
import { APP_URL, JWT_SECRET } from '../config';
import { sendEmail } from '../utils/email';

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

export async function loginUser(email: string, password: string): Promise<ServiceResult<{ token: string; user: unknown }>> {
  const user = await User.findOne({ email });
  if (!user) return { ok: false, status: 401, message: 'Usuario no encontrado' };

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return { ok: false, status: 401, message: 'Credenciales inválidas' };

  // Token de sesión sin expiración para persistencia indefinida.
  const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET);
  const safeUser = user.toObject();
  delete (safeUser as Partial<typeof safeUser>).password;
  return { ok: true, data: { token, user: safeUser } };
}

export async function verifyAuthToken(token: string): Promise<ServiceResult<{ user: unknown }>> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    const user = await User.findById(decoded.userId).select('-password').lean();
    if (!user) return { ok: false, status: 404, message: 'Usuario no encontrado' };
    return { ok: true, data: { user } };
  } catch {
    return { ok: false, status: 401, message: 'Token inválido' };
  }
}

export async function issueResetPassword(email: string): Promise<ServiceResult<null>> {
  const user = await User.findOne({ email });
  if (!user) return { ok: true, data: null };

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetPasswordToken = jwt.sign({ userId: user._id, resetToken }, JWT_SECRET, { expiresIn: '1h' });
  user.resetPasswordToken = resetPasswordToken;
  user.resetPasswordExpires = new Date(Date.now() + 3600000);
  await user.save();

  const resetUrl = `${APP_URL}/auth/reset-password?token=${resetPasswordToken}`;
  const emailContent = `
      <h1>Restablecer tu contraseña</h1>
      <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>Este enlace expira en 1 hora.</p>
    `;
  await sendEmail({
    to: user.email,
    subject: 'Restablecimiento de contraseña',
    html: emailContent,
  });
  return { ok: true, data: null };
}

export async function updatePasswordWithResetToken(token: string, password: string): Promise<ServiceResult<null>> {
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET) as { userId: string; resetToken: string };
  } catch {
    return { ok: false, status: 400, message: 'Token inválido o expirado' };
  }

  const user = await User.findOne({
    _id: decoded.userId,
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) return { ok: false, status: 400, message: 'Token inválido o expirado' };

  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  return { ok: true, data: null };
}
