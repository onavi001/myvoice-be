import bcrypt from 'bcryptjs';
import User from '../models/Users';

type ServiceError = { ok: false; status: number; message: string };
type ServiceOk<T> = { ok: true; data: T };
type ServiceResult<T> = ServiceOk<T> | ServiceError;

export async function getProfileService(userId: string): Promise<ServiceResult<unknown>> {
  const user = await User.findById(userId).select('-password');
  if (!user) return { ok: false, status: 404, message: 'Usuario no encontrado' };
  return { ok: true, data: user };
}

export async function updateProfileService(
  userId: string,
  payload: {
    username?: string;
    email?: string;
    password?: string;
    oldPassword?: string;
    bio?: string;
    goals?: string[];
    notes?: string;
  }
): Promise<ServiceResult<unknown>> {
  const { username, email, password, oldPassword, bio, goals, notes } = payload;
  const user = await User.findById(userId);
  if (!user) return { ok: false, status: 404, message: 'Usuario no encontrado' };

  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email, _id: { $ne: userId } });
    if (existingUser) return { ok: false, status: 400, message: 'El correo ya está en uso' };
  }

  if (password) {
    if (!oldPassword) return { ok: false, status: 400, message: 'La contraseña anterior es obligatoria' };
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) return { ok: false, status: 400, message: 'La contraseña anterior es incorrecta' };
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
  const { password: _password, ...userData } = user.toObject();
  return { ok: true, data: userData };
}
