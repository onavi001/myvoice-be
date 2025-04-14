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
    case "GET":
      try {
        const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || "TU_CLAVE_API_YOUTUBE";
        const { exerciseName } = req.query;
        if (!exerciseName) {
            return res.status(400).json({ error: "Faltan parámetros requeridos" });
        }
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "No autenticado" });

        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
            `${exerciseName} técnica de ejercicio`
          )}&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`
        );
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const videoUrls = data.items.map((item: { id: { videoId: string } }) => `https://www.youtube.com/embed/${item.id.videoId}`);
          res.status(200).json(videoUrls.map((url: string, idx: number) => ({
            url,
            isCurrent: idx === 0,
          })));
        }
        res.status(200).json([]);
      } catch (error) {
        console.error("Error fetching YouTube video:", error);
        res.status(500).json({ error: "Error interno del servidor" });
      }
      break;
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