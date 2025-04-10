import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { dbConnect } from "../../../lib/mongodb";
import User from "../../../models/Users";
import bcrypt from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "Token y contraseña son requeridos" });
    }

    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "my-super-secret-key") as { userId: string; resetToken: string };
    } catch {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }

    // Buscar usuario con el token
    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // Verifica que no haya expirado
    });

    if (!user) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }

    // Actualizar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error en reset-password:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}