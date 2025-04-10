import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { dbConnect } from "../../../../lib/mongodb";
import Day from "../../../../models/Day";
import Exercise from "../../../../models/Exercise";

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
    case "POST":
      try {
        const { name, sets, reps } = req.body;
        const exercise = new Exercise({ name, sets, reps });
        await exercise.save();

        await Day.findByIdAndUpdate(id, { $push: { exercises: exercise._id } });

        res.status(201).json({
          _id: exercise._id.toString(),
          name: exercise.name,
          muscleGroup: exercise.muscleGroup || "",
          sets: exercise.sets,
          reps: exercise.reps,
          repsUnit: exercise.repsUnit,
          weightUnit: exercise.weightUnit,
          weight: exercise.weight || "",
          rest: exercise.rest || "",
          tips: exercise.tips || [],
          completed: exercise.completed || false,
          videos: [],
          notes: exercise.notes || "",
          circuitId: exercise.circuitId
        });
      } catch (error) {
        res.status(500).json({ message: "Error al crear ejercicio", error });
      }
      break;

    default:
      res.status(405).json({ message: "Método no permitido" });
      break;
  }
}