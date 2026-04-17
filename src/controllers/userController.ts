import User from '../models/Users';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';


// Obtener todos los usuarios (solo admin)
export const getUsers = async (req: Request, res: Response) => {
  try {
    // Aquí deberías validar el rol del usuario autenticado (admin)
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error });
  }
};

// Registro de usuario
export const createUser = async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'Usuario creado', userId: user._id });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear usuario', error });
  }
};
