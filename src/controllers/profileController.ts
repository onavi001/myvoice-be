import { Request, Response } from 'express';
import User, { IUser } from '../models/Users';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Middleware para extraer userId del token
function getUserIdFromRequest(req: Request): string | null {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'my-super-secret-key') as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

// Obtener perfil de usuario autenticado
export const getProfile = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  try {
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener perfil', error });
  }
};

// Actualizar perfil de usuario autenticado
export const updateProfile = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  try {
    const { username, email, password, oldPassword, bio, goals, notes } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) return res.status(400).json({ message: 'El correo ya está en uso' });
    }
    if (password) {
      if (!oldPassword) return res.status(400).json({ message: 'La contraseña anterior es obligatoria' });
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isPasswordValid) return res.status(400).json({ message: 'La contraseña anterior es incorrecta' });
      user.password = await bcrypt.hash(password, 10);
    }
    if (username) user.username = username;
    if (email) user.email = email;
    if (bio !== undefined) user.bio = bio;
    if (user.role === 'user') {
      if (goals !== undefined) user.goals = goals;
      if (notes !== undefined) user.notes = notes;
    }
    await user.save();
    const { password: _, ...userData } = user.toObject();
    res.status(200).json(userData);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar perfil', error });
  }
};
