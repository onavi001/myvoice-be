import { NextApiRequest, NextApiResponse } from "next";
import {dbConnect} from "@/lib/mongodb";
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
  switch (req.method) {
    case "GET":
      try {
        const user = await User.findById(userId).lean();
        if (!user) {
          return res.status(404).json({ message: "Usuario no encontrado" });
        }
        if (user.role !== "coach") {
          return res.status(403).json({ message: "Solo los coaches pueden ver clientes" });
        }
        const clients = await User.find({
          coachId: user._id,
          role: "user",
        }).select("username email goals notes");
        return res.status(200).json(clients);
      } catch (error) {
        return res.status(500).json({ message: "Error al obtener clientes", error });
      }
    default:
      return res.status(405).json({ message: "Método no permitido" });
  }
}