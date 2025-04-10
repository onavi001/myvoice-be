import { NextApiRequest, NextApiResponse } from "next";
import {dbConnect} from "../../../lib/mongodb";
import Progress from "../../../models/Progress";
import jwt from "jsonwebtoken";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const { id } = req.query;
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No autenticado" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || "my-super-secret-key") as { userId: string };
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }

  const userId = decoded.userId;

  switch (req.method) {
    case "PUT":
      try {
        const updatedProgress = await Progress.findOneAndUpdate(
          { _id: id, userId },
          req.body,
          { new: true, runValidators: true }
        );
        if (!updatedProgress) {
          return res.status(404).json({ message: "Progreso no encontrado" });
        }
        res.status(200).json(updatedProgress);
      } catch (error) {
        res.status(500).json({ message: "Error al actualizar el progreso", error });
      }
      break;

    case "DELETE":
      try {
        const deletedProgress = await Progress.findOneAndDelete({ _id: id, userId });
        if (!deletedProgress) {
          return res.status(404).json({ message: "Progreso no encontrado" });
        }
        res.status(200).json({ message: "Progreso eliminado correctamente" });
      } catch (error) {
        res.status(500).json({ message: "Error al eliminar el progreso", error });
      }
      break;

    default:
      res.status(405).json({ message: "Método no permitido" });
      break;
  }
}