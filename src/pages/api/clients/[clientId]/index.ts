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
  const { clientId } = req.query;
  switch (req.method) {
    case "GET":
      try {
        const user = await User.findById(userId).lean();
        if (!user) {
          return res.status(404).json({ message: "Usuario no encontrado" });
        }
        if (user.role !== "coach") {
          return res.status(403).json({ message: "Solo los coaches pueden ver perfiles de clientes" });
        }
        const client = await User.findOne({
          _id: clientId,
          coachId: user._id,
          role: "user",
        }).select("username email goals notes");
        if (!client) {
          return res.status(404).json({ message: "Cliente no encontrado o no asignado" });
        }
        return res.status(200).json(client);
      } catch (error) {
        return res.status(500).json({ message: "Error al obtener clientes", error });
      }
    case "PUT":
      try {
        const { goals, notes } = req.body;
        const user = await User.findById(userId).lean();
        if (!user) {
          return res.status(404).json({ message: "Usuario no encontrado" });
        }
        if (user.role !== "coach") {
          return res.status(403).json({ message: "Solo los coaches pueden ver rutinas de clientes" });
        }
        const client = await User.findOne({
          _id: clientId,
          coachId: user._id,
          role: "user",
        });
        if (!client) {
          return res.status(404).json({ message: "Cliente no encontrado o no asignado" });
        }
        if (goals !== undefined) {
          client.goals = goals;
        }
        if (notes !== undefined) {
          client.notes = notes;
        }
    
        await client.save();
        res.status(201).json(client);
      } catch (error) {
        return res.status(500).json({ message: "Error al actualizar cliente", error });
      }
    default:
      return res.status(405).json({ message: "Método no permitido" });
  }
}