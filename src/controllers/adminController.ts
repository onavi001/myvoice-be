import { Request, Response } from 'express';
import User from '../models/Users';
import AdminCoachRequest from '../models/AdminCoachRequest';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

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

// GET /api/admin/users - Listar usuarios (solo admin)
export const listUsers = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  try {
    const user = await User.findById(userId).select('role');
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (user.role !== 'admin') return res.status(403).json({ message: 'Acceso denegado' });
    const users = await User.find().select('_id username email role');
    const serializedUsers = users.map((u) => ({
      _id: u._id,
      username: u.username,
      email: u.email,
      role: u.role,
    }));
    res.status(200).json(serializedUsers);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error });
  }
};

// PUT /api/admin/users/:id - Actualizar usuario (solo admin)
const UserUpdateSchema = z.object({
  name: z.string().min(3).max(50).regex(/^[a-zA-Z0-9\s-]+$/),
  email: z.string().email().max(100),
  role: z.enum(['user', 'coach', 'admin']),
});

export const updateUser = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { id } = req.params;
  try {
    const adminUser = await User.findById(userId).select('role');
    if (!adminUser) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (adminUser.role !== 'admin') return res.status(403).json({ message: 'Acceso denegado' });
    const validation = UserUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.issues.map((err: any) => err.message).join(', ');
      return res.status(400).json({ message: `Validación fallida: ${errors}` });
    }
    const { name, email, role } = validation.data;
    const targetUser = await User.findById(id);
    if (!targetUser) return res.status(404).json({ message: 'Usuario no encontrado' });
    const existingUser = await User.findOne({ email, _id: { $ne: id } });
    if (existingUser) return res.status(400).json({ message: 'El correo ya está en uso' });
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { username: name, email, role },
      { new: true, select: '_id username email role' }
    );
    if (!updatedUser) return res.status(500).json({ message: 'Error al actualizar usuario' });
    const serializedUser = {
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
    };
    res.status(200).json(serializedUser);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar usuario', error });
  }
};

// GET /api/admin/user - Solicitud de coach del usuario autenticado
export const getUserCoachRequest = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  try {
    const user = await User.findById(userId).select('role');
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (user.role !== 'user') return res.status(403).json({ message: 'Solo los usuarios pueden ver sus solicitudes' });
    const request = await AdminCoachRequest.findOne({ userId })
      .sort({ createdAt: -1 })
      .populate('userId', '_id username email role')
      .lean();
    if (!request || Array.isArray(request)) return res.status(200).json(null);
    const serializedRequest = {
      _id: (request as any)._id,
      userId: {
        _id: (request as any).userId?._id?.toString(),
        name: (request as any).userId?.username,
        email: (request as any).userId?.email,
        role: (request as any).userId?.role,
      },
      message: (request as any).message,
      status: (request as any).status,
      createdAt: (request as any).createdAt?.toISOString(),
    };
    res.status(200).json(serializedRequest);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener solicitud', error });
  }
};
