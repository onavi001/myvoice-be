import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { dbConnect } from "../../../lib/mongodb";
import Video from "../../../models/Video";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autenticado" });

  try {
    jwt.verify(token, process.env.JWT_SECRET || "my-super-secret-key");
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }

  switch (req.method) {
    case "POST":
      try {
        const { url, isCurrent } = req.body;
        if (!url) return res.status(400).json({ message: "URL es requerida" });

        const video = new Video({ url, isCurrent: isCurrent ?? false });
        await video.save();

        res.status(201).json({
          _id: video._id.toString(),
          url: video.url,
          isCurrent: video.isCurrent,
        });
      } catch (error) {
        console.error("Error al crear video:", error);
        res.status(500).json({ message: "Error al crear video" });
      }
      break;

    default:
      res.status(405).json({ message: "Método no permitido" });
      break;
  }
}