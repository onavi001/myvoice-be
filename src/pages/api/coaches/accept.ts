import { NextApiRequest, NextApiResponse } from "next";
import {dbConnect} from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import User from "@/models/Users";
import CoachRequest from "@/models/CoachRequest";

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
    case "POST":
      try {
        const coach = await User.findById(userId).lean();
        const { id } = req.body;
        if (!coach) {
          return res.status(404).json({ message: "Usuario no encontrado" });
        }
        
        const request = await CoachRequest.findOne({
          userId: id,
          coachId: coach._id,
          status: "pending",
        });
        if (!request) {
          return res.status(404).json({ message: "Solicitud no encontrada" });
        }

        request.status = "accepted";
        await request.save();

        const user = await User.findById(id);
        if (!user) {
          return res.status(404).json({ message: "Usuario no encontrado" });
        }
        user.coachId = coach._id as unknown as typeof user.coachId;
        await user.save();

        // Rechazar otras solicitudes pendientes del usuario
        await CoachRequest.updateMany(
          { id, status: "pending", _id: { $ne: request._id } },
          { $set: { status: "rejected" } }
        );
        res.status(201).json(user);
      } catch (error) {
        return res.status(500).json({ message: "Error al aceptar solicitud", error });
    }
    default:
      return res.status(405).json({ message: "Método no permitido" });
  }
}