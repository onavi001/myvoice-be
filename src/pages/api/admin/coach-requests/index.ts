import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { z } from "zod";
import AdminCoachRequest from "@/models/AdminCoachRequest";
import User from "@/models/Users";

const CoachRequestSchema = z.object({
  message: z
    .string()
    .min(1, "El mensaje es obligatorio")
    .max(500, "El mensaje no puede exceder 500 caracteres"),
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
    case "GET":
      try {
        const user = await User.findById(userId).select("role");
        if (!user) {
          return res.status(404).json({ message: "Usuario no encontrado" });
        }
        if (user.role !== "admin") {
          return res.status(403).json({ message: "Acceso denegado" });
        }

        const requests = await AdminCoachRequest.find()
          .populate("userId", "_id username email role")
          .lean();

        const serializedRequests = requests.map((req) => ({
          _id: req._id,
          userId: {
            _id: req.userId._id.toString(),
            username: req.userId.username,
            email: req.userId.email,
            role: req.userId.role,
          },
          message: req.message,
          status: req.status,
          createdAt: req.createdAt.toISOString(),
        }));

        return res.status(200).json(serializedRequests);
      } catch (error) {
        return res.status(500).json({ message: "Error al obtener solicitudes", error });
      }
    case "POST":
      try {
        const user = await User.findById(userId).select("role");
        if (!user) {
          return res.status(404).json({ message: "Usuario no encontrado" });
        }
        if (user.role !== "user") {
          return res.status(403).json({ message: "Solo los usuarios pueden solicitar ser coach" });
        }

        const validation = CoachRequestSchema.safeParse(req.body);
        if (!validation.success) {
          const errors = validation.error.errors.map((err) => err.message).join(", ");
          return res.status(400).json({ message: `Validación fallida: ${errors}` });
        }

        const { message } = validation.data;

        const existingRequest = await AdminCoachRequest.findOne({
          userId,
          status: "pending",
        });
        if (existingRequest) {
          return res.status(400).json({ message: "Ya tienes una solicitud pendiente" });
        }

        const request = new AdminCoachRequest({
          userId,
          message,
          status: "pending",
        });
        await request.save();

        const populatedRequest = await AdminCoachRequest.findById(request._id)
          .populate("userId", "_id username email role")
          .lean();
        if (!populatedRequest) {
          return res.status(404).json({ message: "Solicitud no encontrada" });
        }
        if (!populatedRequest || Array.isArray(populatedRequest)) {
          return res.status(200).json(null);
        }
        // Serialize the populated request
        const serializedRequest = {
          _id: populatedRequest._id,
          userId: {
            _id: populatedRequest.userId._id.toString(),
            name: populatedRequest.userId.username,
            email: populatedRequest.userId.email,
            role: populatedRequest.userId.role,
          },
          message: populatedRequest.message,
          status: populatedRequest.status,
          createdAt: populatedRequest.createdAt.toISOString(),
        };

        return res.status(201).json(serializedRequest);
      } catch (error) {
        return res.status(500).json({ message: "Error al crear solicitud", error });
      }
    default:
      return res.status(405).json({ message: "Método no permitido" });
  }
}