import { NextApiRequest, NextApiResponse } from "next";
import {dbConnect} from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import User from "@/models/Users";
import CoachRequest from "@/models/CoachRequest";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  console.log("Request body:", req.body);
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autenticado" });
  
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || "my-super-secret-key") as { userId: string };
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
  
  const userId = decoded.userId;
  console.log(req.body)
  switch (req.method) {
    case "POST":
      try {
        const user = await User.findById(userId).lean();
        const { id } = req.body;
        if (!user) {
          return res.status(404).json({ message: "Usuario no encontrado" });
        }
        if (user.role !== "user") {
          return res.status(403).json({ message: "Solo los usuarios pueden solicitar coaches" });
        }
        if (user.coachId) {
          return res.status(400).json({ message: "Ya tienes un coach asignado" });
        }
        const coach = await User.findById(id);
        if (!coach || coach.role !== "coach") {
          return res.status(404).json({ message: "Coach no encontrado" });
        }
        const existingRequest = await CoachRequest.findOne({
          userId,
          status: "pending",
        });
        if (existingRequest) {
          return res.status(400).json({ message: "Ya tienes una solicitud pendiente" });
        }
        const coachRequest = new CoachRequest({
          userId,
          coachId:id,
          status: "pending",
        });
        await coachRequest.save();

        res.status(201).json({ message: "Solicitud enviada" });
      } catch (error) {
        return res.status(500).json({ message: "Error al enviar solicitud", error });
    }
    case "GET":
      try {
        const user = await User.findById(userId).lean();
        if (!user) {
          return res.status(404).json({ message: "Usuario no encontrado" });
        }
        if (user.role !== "coach") {
          return res.status(403).json({ message: "Solo los coaches pueden ver solicitudes" });
        }
        const requests = await CoachRequest.find({
          coachId: userId,
          status: "pending",
        })
          .populate("userId", "username email")
          .lean();
        res.status(200).json(requests);
      } catch (error) {
        return res.status(500).json({ message: "Error al obtener solicitudes", error });
      }
    default:
      return res.status(405).json({ message: "Método no permitido" });
  }
}