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

  if (req.method === "GET") {
    try {
      const user = await User.findById(userId).select("role");
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      if (user.role !== "user") {
        return res.status(403).json({ message: "Solo los usuarios pueden ver sus solicitudes" });
      }

      const request = await AdminCoachRequest.findOne({ userId })
        .sort({ createdAt: -1 })
        .populate("userId", "_id username email role")
        .lean();

      if (!request) {
        return res.status(200).json(null);
      }
      if (!request || Array.isArray(request)) {
        return res.status(200).json(null);
      }
      const serializedRequest = {
        _id: request._id,
        userId: {
          _id: request.userId._id.toString(),
          name: request.userId.username,
          email: request.userId.email,
          role: request.userId.role,
        },
        message: request.message,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
      };

      return res.status(200).json(serializedRequest);
    } catch (error) {
      return res.status(500).json({ message: "Error al obtener solicitud", error });
    }
  } else {
    return res.status(405).json({ message: "Método no permitido" });
  }
}