import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "@/models/Users";

const UserUpdateSchema = z.object({
  name: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(50, "El nombre no puede exceder 50 caracteres")
    .regex(/^[a-zA-Z0-9\s-]+$/, "El nombre solo puede contener letras, números, guiones o espacios"),
  email: z
    .string()
    .email("Ingresa un correo válido")
    .max(100, "El correo no puede exceder 100 caracteres"),
  role: z.enum(["user", "coach", "admin"], { message: "Rol inválido" }),
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
  const { id } = req.query;

  if (req.method === "PUT") {
    try {
      const adminUser = await User.findById(userId).select("role");
      if (!adminUser) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      if (adminUser.role !== "admin") {
        return res.status(403).json({ message: "Acceso denegado" });
      }

      const body = req.body;
      const validation = UserUpdateSchema.safeParse(body);
      if (!validation.success) {
        const errors = validation.error.errors.map((err) => err.message).join(", ");
        return res.status(400).json({ message: `Validación fallida: ${errors}` });
      }

      const { name, email, role } = validation.data;

      const targetUser = await User.findById(id);
      if (!targetUser) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({ message: "El correo ya está en uso" });
      }

      const updatedUser = await User.findByIdAndUpdate(
        id,
        { username: name, email, role },
        { new: true, select: "_id username email role" }
      );

      if (!updatedUser) {
        return res.status(500).json({ message: "Error al actualizar usuario" });
      }

      const serializedUser = {
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
      };

      return res.status(200).json(serializedUser);
    } catch (error) {
      return res.status(500).json({ message: "Error al actualizar usuario", error });
    }
  } else {
    return res.status(405).json({ message: "Método no permitido" });
  }
}