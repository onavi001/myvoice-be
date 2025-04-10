import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { dbConnect } from "../../../lib/mongodb";
import Day from "../../../models/Day";
import Exercise, { IExercise } from "../../../models/Exercise";
import Routine from "../../../models/Routine";
import VideoModel, { IVideo } from "../../../models/Video";

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
        const { dayName } = req.body;
        const day = await Day.findByIdAndUpdate(id, { dayName }, { new: true })
          .populate("exercises")
          .lean();
        if (!day) return res.status(404).json({ message: "Día no encontrado" });

        res.status(200).json({
          _id: day._id.toString(),
          dayName: day.dayName,
          musclesWorked: day.musclesWorked,
          warmupOptions: day.warmupOptions,
          explanation: day.explanation,
          exercises: day.exercises.map((e: Partial<IExercise>) => ({
            _id: e._id?.toString(),
            name: e.name,
            muscleGroup: e.muscleGroup,
            sets: e.sets,
            reps: e.reps,
            repsUnit: e.repsUnit,
            weightUnit: e.weightUnit,
            weight: e.weight,
            rest: e.rest,
            tips: e.tips,
            completed: e.completed,
            videos: e.videos || [],
            notes: e.notes,
            circuitId: e.circuitId,
          })),
        });
      } catch (error) {
        res.status(500).json({ message: "Error al actualizar día", error });
      }
      break;

    case "DELETE":
      try {
        const day = await Day.findByIdAndDelete(id);
        if (!day) return res.status(404).json({ message: "Día no encontrado" });

        const exercises = await Exercise.find({ _id: { $in: day.exercises } });
        const videoIds = exercises.flatMap((exercise) => exercise.videos as unknown as IVideo);
        await Exercise.deleteMany({ _id: { $in: day.exercises } });
        if (videoIds.length > 0) {
          await VideoModel.deleteMany({ _id: { $in: videoIds } });
        }
        await Routine.updateMany({}, { $pull: { days: id } });
        res.status(204).end();
      } catch (error) {
        res.status(500).json({ message: "Error al eliminar día", error });
      }
      break;

    default:
      res.status(405).json({ message: "Método no permitido" });
      break;
  }
}