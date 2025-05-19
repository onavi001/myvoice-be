import { NextApiRequest, NextApiResponse } from "next";
import {dbConnect} from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import User, { IUser } from "@/models/Users";

const ProfileUpdateSchema = z.object({
  username: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(50, "El nombre no puede exceder 50 caracteres")
    .regex(/^[a-zA-Z0-9\s-]+$/, "El nombre solo puede contener letras, números, guiones o espacios"),
  email: z
    .string()
    .email("Ingresa un correo válido")
    .max(100, "El correo no puede exceder 100 caracteres"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(50, "La contraseña no puede exceder 50 caracteres")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#])[A-Za-z\d@$!%*?&.#]{8,50}$/,
      "La contraseña debe incluir una mayúscula, una minúscula, un número y un carácter especial (@, $, !, %, *, ?, &, ., #)"
    )
    .optional(),
  oldPassword: z
    .string()
    .min(8, "La contraseña anterior debe tener al menos 8 caracteres")
    .max(50, "La contraseña anterior no puede exceder 50 caracteres")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#])[A-Za-z\d@$!%*?&.#]{8,50}$/,
      "La contraseña anterior debe incluir una mayúscula, una minúscula, un número y un carácter especial (@, $, !, %, *, ?, &, ., #)"
    )
    .optional(),
  bio: z.string().max(500, "La bio no puede exceder 500 caracteres").optional(),
  goals: z
    .array(z.string().min(2, "Cada objetivo debe tener al menos 2 caracteres").max(50, "Cada objetivo no puede exceder 50 caracteres"))
    .max(10, "No puedes tener más de 10 objetivos")
    .optional(),
  notes: z.string().max(500, "Las notas no pueden exceder 500 caracteres").optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autenticado" });
  
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || "my-super-secret-key") as { userId: string };
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
  const userId = decoded.userId;
  switch (req.method) {
    case "PUT":
      try {
        const body = req.body;
        const validation = ProfileUpdateSchema.safeParse(body);
        if (!validation.success) {
          const errors = validation.error.errors.map((err) => err.message).join(", ");
          return res.status(400).json({ message: `Validación fallida: ${errors}` });
        }
        const { username, email, password, oldPassword, bio, goals, notes } = validation.data;

        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: "Usuario no encontrado" });
        }

        const existingUser = await User.findOne({ email, _id: { $ne: userId } });
        if (existingUser) {
          return res.status(400).json({ message: "El correo ya está en uso" });
        }

        if (password) {
          if (!oldPassword) {
            return res.status(400).json({ message: "La contraseña anterior es obligatoria" });
          }
          const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
          if (!isPasswordValid) {
            return res.status(400).json({ message: "La contraseña anterior es incorrecta" });
          }
        }

        if (user.role === "coach" && (goals || notes)) {
          return res.status(403).json({ message: "Solo los clientes pueden actualizar objetivos y notas" });
        }

        const updateData: Partial<IUser> = {
          username,
          email,
          bio: bio || "",
        };
    
        if (password) {
          updateData.password = await bcrypt.hash(password, 10);
        }
    
        if (user.role === "user") {
          updateData.goals = goals || [];
          updateData.notes = notes || "";
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
          new: true,
          select: "-password",
        });
    
        if (!updatedUser) {
          return res.status(500).json({ message: "Error al actualizar el perfil" });
        }
    
        // Serializar respuesta
        const serializedUser = {
          username: updatedUser.username,
          email: updatedUser.email,
          bio: updatedUser.bio,
          goals: updatedUser.goals,
          notes: updatedUser.notes,
          role: updatedUser.role,
        };
    
        return res.status(200).json(serializedUser);
      } catch (error) {
        return res.status(500).json({ message: "Error al actualizar cliente", error });
      }
    default:
      return res.status(405).json({ message: "Método no permitido" });
  }
}