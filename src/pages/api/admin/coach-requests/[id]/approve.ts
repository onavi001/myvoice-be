import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import AdminCoachRequest from "@/models/AdminCoachRequest";
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
  const { id } = req.query;

  if (req.method === "POST") {
    try {
      const adminUser = await User.findById(userId).select("role");
      if (!adminUser) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      if (adminUser.role !== "admin") {
        return res.status(403).json({ message: "Acceso denegado" });
      }

      const request = await AdminCoachRequest.findById(id).populate("userId", "_id username email role");
      if (!request) {
        return res.status(404).json({ message: "Solicitud no encontrada" });
      }
      if (request.status !== "pending") {
        return res.status(400).json({ message: "La solicitud ya ha sido procesada" });
      }

      await User.findByIdAndUpdate(request.userId._id, { role: "coach" });
      request.status = "approved";
      await request.save();

      const serializedRequest = {
        _id: request._id.toString(),
        userId: {
          _id: request.userId._id.toString(),
          username: request.userId.username,
          email: request.userId.email,
          role: "coach",
        },
        message: request.message,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
      };

      return res.status(200).json(serializedRequest);
    } catch (error) {
      return res.status(500).json({ message: "Error al aprobar solicitud", error });
    }
  } else {
    return res.status(405).json({ message: "Método no permitido" });
  }
}