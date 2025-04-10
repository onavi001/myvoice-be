import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { dbConnect } from "../../../lib/mongodb";
import Progress from "../../../models/Progress";

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
        const progress = await Progress.find({ userId }).lean();
        const serializedProgress = progress.map((p) => ({
          _id: p._id.toString(),
          userId: p.userId.toString(),
          name: p.name,
          sets: p.sets,
          reps: p.reps,
          repsUnit: p.repsUnit,
          weightUnit: p.weightUnit,
          weight: p.weight,
          notes: p.notes,
          date: p.date.toISOString(),
        }));
        res.status(200).json(serializedProgress);
      } catch (error) {
        res.status(500).json({ message: "Error al obtener progreso", error });
      }
      break;

    case "POST":
      try {
        const { name, sets, reps, weight, notes, date, weightUnit, repsUnit } = req.body;
        const progressEntry = new Progress({
          userId,
          name: name,
          sets,
          reps,
          repsUnit: repsUnit || "count",
          weightUnit: weightUnit || "kg",
          weight: weight || "",
          notes: notes || "",
          date: date || new Date(),
        });
        await progressEntry.save();

        res.status(201).json({
          _id: progressEntry._id.toString(),
          userId: progressEntry.userId.toString(),
          name: progressEntry.name,
          sets: progressEntry.sets,
          reps: progressEntry.reps,
          repsUnit: progressEntry.repsUnit,
          weightUnit: progressEntry.weightUnit,
          weight: progressEntry.weight,
          notes: progressEntry.notes,
          date: progressEntry.date.toISOString(),
        });
      } catch (error) {
        res.status(500).json({ message: "Error al agregar progreso", error });
      }
      break;

    default:
      res.status(405).json({ message: "Método no permitido" });
      break;
  }
}