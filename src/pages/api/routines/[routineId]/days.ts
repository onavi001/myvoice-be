import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../../lib/mongodb";
import Routine from "../../../../models/Routine";
import Day from "../../../../models/Day";
import Exercise, { IExercise } from "../../../../models/Exercise";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autenticado" });

  const { routineId } = req.query;

  switch (req.method) {
    case "POST":
      try {
        const { dayName, musclesWorked, warmupOptions, explanation, exercises } = req.body;
        const exerciseIds = [];
        const newExercises:IExercise[] = [];
        for (const exData of exercises || []) {
          const exercise = new Exercise({
            name:exData.name || "",
            muscleGroup:exData.muscleGroup || [],
            sets:exData.sets || 0,
            reps:exData.reps || 0,
            repsUnit:exData.repsUnit || "count",
            weightUnit:exData.weightUnit || "kg",
            weight:exData.weight || 0,
            rest:exData.rest || "0",
            tips:exData.tips || [],
            circuitId: exData.circuitId,
          } as IExercise);
          await exercise.save();
          newExercises.push(exercise);
          exerciseIds.push(exercise._id);
        }

        const day = new Day({ dayName, musclesWorked, warmupOptions, explanation, exercises: exerciseIds });
        await day.save();

        await Routine.findByIdAndUpdate(routineId, { $push: { days: day._id } });

        res.status(201).json({
          _id: day._id.toString(),
          dayName: day.dayName,
          musclesWorked: day.musclesWorked || [],
          warmupOptions: day.warmupOptions || [],
          explanation: day.explanation || "",
          exercises: exerciseIds.map((id) => ({
            _id: id,
            name: newExercises.find((e: IExercise) => e._id?.toString() === id.toString())?.name || "",
            sets: newExercises.find((e: IExercise) => e._id?.toString() === id.toString())?.sets || 0,
            reps: newExercises.find((e: IExercise) => e._id?.toString() === id.toString())?.reps || 0,
            repsUnit: newExercises.find((e: IExercise) => e._id?.toString() === id.toString())?.repsUnit || "count",
            weightUnit: newExercises.find((e: IExercise) => e._id?.toString() === id.toString())?.weightUnit || "kg",
            circuitId: newExercises.find((e: IExercise) => e._id?.toString() === id.toString())?.circuitId || "",
            weight: newExercises.find((e: IExercise) => e._id?.toString() === id.toString())?.weight || 0,
            rest: newExercises.find((e: IExercise) => e._id?.toString() === id.toString())?.rest || "",
            tips: newExercises.find((e: IExercise) => e._id?.toString() === id.toString())?.tips || [],
            completed: false,
            videos: [],
          })),
        });
      } catch (error) {
        res.status(500).json({ message: "Error al crear día", error });
      }
      break;

    default:
      res.status(405).json({ message: "Método no permitido" });
      break;
  }
}