import { Request, Response } from 'express';
import User from '../models/Users';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendEmail } from '../utils/email';
import { JWT_SECRET, APP_URL } from '../config';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Usuario no encontrado' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Credenciales inválidas' });
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ message: 'Login exitoso', token, user });
  } catch (error) {
    res.status(500).json({ message: 'Error en login', error });
  }
};

export const verifyToken = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No se proporcionó token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    const user = await User.findById(decoded.userId).lean();
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.status(200).json({ user });
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Correo electrónico requerido' });
  try {
    const user = await User.findOne({ email });
    if (!user) {
      // No revelar si el correo existe
      return res.status(200).json({ message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña' });
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordToken = jwt.sign(
      { userId: user._id, resetToken },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
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
    res.status(200).json({ message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña' });
  } catch (error) {
    res.status(500).json({ message: 'Error en forgot-password', error });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Token y contraseña son requeridos' });
  try {
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string; resetToken: string };
    } catch {
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }
    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Token inválido o expirado' });
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error en reset-password', error });
  }
};
