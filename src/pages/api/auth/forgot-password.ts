import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { dbConnect } from "../../../lib/mongodb";
import Users from "../../../models/Users";
import { sendEmail } from "../../../lib/email"; // Función para enviar correos (ver más abajo)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Correo electrónico requerido" });
    }

    // Buscar usuario por correo
    const user = await Users.findOne({ email });
    if (!user) {
      // No revelamos si el correo existe por seguridad
      return res.status(200).json({ message: "Si el correo existe, recibirás un enlace para restablecer tu contraseña" });
    }

    // Generar token de restablecimiento
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordToken = jwt.sign(
      { userId: user._id, resetToken },
      process.env.JWT_SECRET || "my-super-secret-key",
      { expiresIn: "1h" } // Expira en 1 hora
    );

    // Guardar token y fecha de expiración en el usuario
    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hora desde ahora
    await user.save();

    // Enviar correo con el enlace
    const resetUrl = `${process.env.APP_URL}/auth/reset-password?token=${resetPasswordToken}`;
    const emailContent = `
      <h1>Restablecer tu contraseña</h1>
      <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>Este enlace expira en 1 hora.</p>
    `;
    await sendEmail({
      to: user.email,
      subject: "Restablecimiento de contraseña",
      html: emailContent,
    });

    res.status(200).json({ message: "Si el correo existe, recibirás un enlace para restablecer tu contraseña" });
  } catch (error) {
    console.error("Error en forgot-password:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}