import { NextApiRequest, NextApiResponse } from "next";
import {dbConnect} from "../../../lib/mongodb";
import jwt from "jsonwebtoken";
import User from "../../../models/Users";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autenticado" });
  
  try {
    jwt.verify(token, process.env.JWT_SECRET || "my-super-secret-key") as { userId: string };
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }

  switch (req.method) {
    case "GET":
      try {
        const coaches = await User.find({ role: "coach" }).select("-password").lean();
        const serializedCoaches = coaches.map((c) => ({
          _id: c._id.toString(),
          username: c.username,
          email: c.email,
          specialties: c.specialties,
          bio: c.bio,
        }));
        return res.status(200).json(serializedCoaches);
      } catch (error) {
        return res.status(500).json({ message: "Error al obtener los coaches", error });
      }
    default:
      return res.status(405).json({ message: "Método no permitido" });
  }
}