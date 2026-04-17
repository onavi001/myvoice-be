import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { dbConnect } from "../../../../lib/mongodb";
import Day from "../../../../models/Day";
import Exercise, { IExercise } from "../../../../models/Exercise";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  // Validar autenticación
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autenticado" });

  try {
    jwt.verify(token, process.env.JWT_SECRET || "my-super-secret-key") as { userId: string };
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    return res.status(400).json({ message: "ID de rutina inválido" });
  }

  switch (req.method) {
    case "PUT":
      try {
        const populatedDay = await Day.findById({_id:id})
          .populate({ path: "exercises", populate: "videos" });
        if (!populatedDay) return res.status(404).json({ message: "Dia no encontrado" });

        const exercises: IExercise[] = populatedDay.exercises as IExercise[];
        for (const exData of exercises) {
          const updatedExercise = exData.completed === false 
            ? exData 
            : await Exercise.findOneAndUpdate(
              { _id: exData._id },
              { completed: false },
              { new: true }
            ).populate("videos");
          if (!updatedExercise) throw new Error(`Ejercicio ${exData._id} no encontrado`);
        }
        res.status(200).json(populatedDay);
      } catch (error) {
        console.error("Error al actualizar rutina:", error);
        res.status(500).json({ message: "Error al actualizar rutina", error: (error as Error).message });
      }
      break;

    default:
      res.status(405).json({ message: "Método no permitido" });
      break;
  }
}
