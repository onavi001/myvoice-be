import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import User from "@/models/Users";

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
  if (req.method === "GET") {
    try {
      const user = await User.findById(userId).select("role");
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Acceso denegado" });
      }
      const users = await User.find().select("_id username email role");
      const serializedUsers = users.map((user) => ({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      }));
      return res.status(200).json(serializedUsers);
    } catch (error) {
      return res.status(500).json({ message: "Error al obtener usuarios", error });
    }
  } else {
    return res.status(405).json({ message: "Método no permitido" });
  }
}