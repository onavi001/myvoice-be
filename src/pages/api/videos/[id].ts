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

  const { id } = req.query;

  switch (req.method) {
    case "PUT":
      try {
        const { url, isCurrent } = req.body;
        const video = await Video.findByIdAndUpdate(
          id,
          { url, isCurrent },
          { new: true, runValidators: true }
        );
        if (!video) return res.status(404).json({ message: "Video no encontrado" });

        res.status(200).json({
          _id: video._id.toString(),
          url: video.url,
          isCurrent: video.isCurrent,
        });
      } catch (error) {
        console.error("Error al actualizar video:", error);
        res.status(500).json({ message: "Error al actualizar video" });
      }
      break;

    case "DELETE":
      try {
        const video = await Video.findByIdAndDelete(id);
        if (!video) return res.status(404).json({ message: "Video no encontrado" });

        res.status(204).end();
      } catch (error) {
        console.error("Error al eliminar video:", error);
        res.status(500).json({ message: "Error al eliminar video" });
      }
      break;

    default:
      res.status(405).json({ message: "Método no permitido" });
      break;
  }
}