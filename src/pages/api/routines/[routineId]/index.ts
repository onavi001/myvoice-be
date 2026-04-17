import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { dbConnect } from "../../../../lib/mongodb";
import Routine from "../../../../models/Routine";
import Day, { IDay } from "../../../../models/Day";
import Exercise, { IExercise } from "../../../../models/Exercise";
import Video, { IVideo } from "../../../../models/Video";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  // Validar autenticación
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autenticado" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || "my-super-secret-key") as { userId: string };
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }

  const { routineId } = req.query;
  if (!mongoose.Types.ObjectId.isValid(routineId as string)) {
    return res.status(400).json({ message: "ID de rutina inválido" });
  }

  switch (req.method) {
    case "GET":
      try {
        const populatedRoutine = await Routine.findById({_id:routineId})
          .populate({ path: "days", populate: { path: "exercises", populate: "videos" } });
        if (!populatedRoutine) return res.status(404).json({ message: "Rutina no encontrada" });
        console.log("Rutina obtenida:", populatedRoutine);
        res.status(200).json(populatedRoutine);
      } catch (error) {
        console.error("Error al obtener rutina:", error);
        res.status(500).json({ message: "Error al obtener rutina", error: (error as Error).message });
      }
      break;
    case "PUT":
      try {
        const { routineData } = req.body;
        if (!routineData || !Array.isArray(routineData.days)) {
          return res.status(400).json({ message: "Datos de rutina inválidos" });
        }

        const { days } = routineData;
        const dayIdsForRoutine: mongoose.Types.ObjectId[] = [];

        // Eliminar días obsoletos
        const oldRoutine = await Routine.findById(routineData._id);
        if (oldRoutine) {
          const daysToDelete  = (oldRoutine.days || []).filter(
            (od) => !days.some((d: IDay) => d._id?.toString() === od.toString())
          );
          await deleteDays(daysToDelete.map(id => new mongoose.Types.ObjectId(id.toString())));
        }

        // Procesar días nuevos o actualizados
        for (const dayData of days) {
          const exercises: IExercise[] = dayData.exercises || [];
          const exerciseIdsForDay: mongoose.Types.ObjectId[] = [];

          // Eliminar ejercicios obsoletos si el día ya existe
          if (dayData._id) {
            const oldDay = await Day.findById(dayData._id);
            if (oldDay) {
              const exercisesToDelete = (oldDay.exercises || []).filter(
                (oex) => !exercises.some((e) => e._id?.toString() === oex.toString())
              );
              await deleteExercises(exercisesToDelete.map(id => new mongoose.Types.ObjectId(id.toString())));
            }
          }

          // Crear o actualizar ejercicios
          for (const exData of exercises) {
            if (exData._id) {
              const updatedExercise = await Exercise.findOneAndUpdate(
                { _id: exData._id },
                {
                  name: exData.name,
                  muscleGroup: exData.muscleGroup,
                  sets: exData.sets,
                  reps: exData.reps,
                  repsUnit: exData.repsUnit,
                  rest: exData.rest,
                  tips: exData.tips,
                  circuitId: exData.circuitId,
                },
                { new: true }
              ).populate("videos");
              if (!updatedExercise) throw new Error(`Ejercicio ${exData._id} no encontrado`);
              exerciseIdsForDay.push(updatedExercise._id);
            } else {
              const exercise = new Exercise({ ...exData, videos: [] });
              await exercise.save();
              exerciseIdsForDay.push(exercise._id);
            }
          }

          // Crear o actualizar día
          if (dayData._id) {
            const updatedDay = await Day.findByIdAndUpdate(
              dayData._id,
              {
                dayName: dayData.dayName,
                musclesWorked: dayData.musclesWorked,
                warmupOptions: dayData.warmupOptions,
                explanation: dayData.explanation,
                exercises: exerciseIdsForDay,
              },
              { new: true }
            ).populate("exercises");
            if (!updatedDay) throw new Error(`Día ${dayData._id} no encontrado`);
            dayIdsForRoutine.push(updatedDay._id);
          } else {
            const day = new Day({ ...dayData, exercises: exerciseIdsForDay });
            await day.save();
            dayIdsForRoutine.push(day._id);
          }
        }

        // Actualizar rutina
        const routine = await Routine.findOneAndUpdate(
          { _id: routineId, userId: decoded.userId },
          { name: routineData.name, days: dayIdsForRoutine },
          { new: true }
        ).populate({ path: "days", populate: { path: "exercises", populate: "videos" } });
        if (!routine) return res.status(404).json({ message: "Rutina no encontrada" });

        res.status(200).json(routine);
      } catch (error) {
        console.error("Error al actualizar rutina:", error);
        res.status(500).json({ message: "Error al actualizar rutina", error: (error as Error).message });
      }
      break;

    case "DELETE":
      try {
        const routine = await Routine.findOneAndDelete({ _id: routineId, userId: decoded.userId });
        if (!routine) return res.status(404).json({ message: "Rutina no encontrada" });

        // Eliminar días, ejercicios y videos en cascada
        const dayIds = routine.days;
        if (dayIds.length > 0) {
          const days = await Day.find({ _id: { $in: dayIds } });
          const exerciseIds = days.flatMap((day) => day.exercises.map(ex => new mongoose.Types.ObjectId(ex.toString())));
          const exercises = await Exercise.find({ _id: { $in: exerciseIds } });
          const videoIds = exercises.flatMap((ex) => ex.videos.map((video) => new mongoose.Types.ObjectId(video._id.toString())));

          await Day.deleteMany({ _id: { $in: dayIds } });
          await Exercise.deleteMany({ _id: { $in: exerciseIds } });
          if (videoIds.length > 0) {
            await Video.deleteMany({ _id: { $in: videoIds } });
          }
        }

        res.status(204).end();
      } catch (error) {
        console.error("Error al eliminar rutina:", error);
        res.status(500).json({ message: "Error al eliminar rutina", error: (error as Error).message });
      }
      break;

    default:
      res.status(405).json({ message: "Método no permitido" });
      break;
  }
}

// Funciones auxiliares para eliminación
async function deleteDays(dayIds: mongoose.Types.ObjectId[]) {
  for (const dayId of dayIds) {
    const day = await Day.findByIdAndDelete(dayId);
    if (day) {
      const exercises = await Exercise.find({ _id: { $in: day.exercises } });
      const videoIds = exercises.flatMap((ex) => ex.videos.map((video: Partial<IVideo>) => new mongoose.Types.ObjectId(video._id?.toString())));
      await Exercise.deleteMany({ _id: { $in: day.exercises } });
      if (videoIds.length > 0) {
        await Video.deleteMany({ _id: { $in: videoIds } });
      }
      await Routine.updateMany({}, { $pull: { days: dayId } });
    }
  }
}

async function deleteExercises(exerciseIds: mongoose.Types.ObjectId[]) {
  for (const exerciseId of exerciseIds) {
    const exercise = await Exercise.findByIdAndDelete(exerciseId);
    if (exercise) {
      await Video.deleteMany({ _id: { $in: exercise.videos } });
      await Day.updateMany({}, { $pull: { exercises: exerciseId } });
    }
  }
}