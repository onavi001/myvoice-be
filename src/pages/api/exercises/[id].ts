import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { dbConnect } from "../../../lib/mongodb";
import Exercise, { IExercise } from "../../../models/Exercise";
import Video from "../../../models/Video";
import Day from "../../../models/Day";

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
        const { name, muscleGroup, sets, reps, weight, rest, tips, completed, videos, notes, weightUnit, repsUnit, circuitId } = req.body;
        const updateData:Partial<IExercise> = {};
        if (name) updateData.name = name;
        if (muscleGroup) updateData.muscleGroup = muscleGroup;
        if (sets !== undefined) updateData.sets = sets;
        if (reps !== undefined) updateData.reps = reps;
        if (repsUnit !== undefined) updateData.repsUnit = repsUnit;
        if (weightUnit !== undefined) updateData.weightUnit = weightUnit;
        if (weight !== undefined) updateData.weight = weight;
        if (rest) updateData.rest = rest;
        if (tips) updateData.tips = tips;
        if (completed !== undefined) updateData.completed = completed;
        if (videos) updateData.videos = videos;
        if (notes !== undefined) updateData.notes = notes;
        if (circuitId !== undefined) updateData.circuitId = circuitId;

        const exercise = await Exercise.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
          .populate("videos")
          .lean();
        if (!exercise) return res.status(404).json({ message: "Ejercicio no encontrado" });

        res.status(200).json(exercise);
      } catch (error) {
        res.status(500).json({ message: "Error al actualizar ejercicio", error });
      }
      break;

    case "DELETE":
      try {
        const exercise = await Exercise.findByIdAndDelete(id);
        if (!exercise) return res.status(404).json({ message: "Ejercicio no encontrado" });

        await Video.deleteMany({ _id: { $in: exercise.videos } });
        await Day.updateMany({}, { $pull: { exercises: id } });
        res.status(204).end();
      } catch (error) {
        res.status(500).json({ message: "Error al eliminar ejercicio", error });
      }
      break;

    default:
      res.status(405).json({ message: "Método no permitido" });
      break;
  }
}