import User from '../models/Users';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { sendError, sendSuccess } from '../utils/apiResponse';


// Obtener todos los usuarios (solo admin)
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password');
    return sendSuccess(res, 200, 'Usuarios obtenidos correctamente', users);
  } catch (error) {
    return sendError(res, 500, 'Error al obtener usuarios');
  }
};

// Registro de usuario
export const createUser = async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 400, 'El usuario ya existe');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    return sendSuccess(res, 201, 'Usuario creado', { userId: user._id });
  } catch (error) {
    return sendError(res, 500, 'Error al crear usuario');
  }
};
