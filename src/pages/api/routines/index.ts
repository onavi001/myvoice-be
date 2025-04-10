import { NextApiRequest, NextApiResponse } from "next";
import {dbConnect} from "../../../lib/mongodb";
import Routine from "../../../models/Routine";
import Day, { IDay } from "../../../models/Day";
import Exercise, { IExercise } from "../../../models/Exercise";
import Video, { IVideo } from "../../../models/Video";
import jwt from "jsonwebtoken";

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
        const routines = await Routine.find({
          userId,
          name: { $ne: null }, // Filtra rutinas con nombre no vacío ni null
          "days.0": { $exists: true }, // Asegura que haya al menos un día
        })
        .populate({
          path: "days",
          populate: {
            path: "exercises",
            populate: { path: "videos" },
          },
        })
        .lean();
        const validRoutines = routines.filter((routine) => {
          const hasValidDays = routine.days.length > 0 && routine.days.every((day: Partial<IDay>) => {
            const exercises = day.exercises ?? [];
            return exercises.length > 0;
          });
          return hasValidDays;
        });
        const serializedRoutines = validRoutines.map((r) => ({
          _id: r._id.toString(),
          userId: r.userId.toString(),
          name: r.name,
          days: r.days.map((d: Partial<IDay>) => ({
            _id: d._id?.toString(),
            dayName: d.dayName,
            musclesWorked: d.musclesWorked,
            warmupOptions: d.warmupOptions,
            explanation: d.explanation,
            exercises: (d.exercises ?? []).map((e: Partial<IExercise>) => ({
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
              videos: (e.videos ?? []).map((v: Partial<IVideo>) => ({
                _id: v._id?.toString(),
                url: v.url,
                isCurrent: v.isCurrent,
              })),
              notes: e.notes,
            })),
          })),
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
        res.status(200).json(serializedRoutines);
      } catch (error) {
        res.status(500).json({ message: "Error al obtener rutinas", error });
      }
      break;

    case "POST":
      try {
        const { name, days } = req.body;

        // Crear videos, ejercicios y días
        const videoIds = [];
        const exerciseIds = [];
        const dayIds = [];

        for (const dayData of days) {
          const exercises = dayData.exercises || [];
          const exerciseIdsForDay = [];

          for (const exData of exercises) {
            const videos = exData.videos || [];
            const videoIdsForExercise = [];

            for (const videoData of videos) {
              const video = new Video(videoData);
              await video.save();
              videoIds.push(video._id);
              videoIdsForExercise.push(video._id);
            }

            const exercise = new Exercise({ ...exData, videos: videoIdsForExercise });
            await exercise.save();
            exerciseIds.push(exercise._id);
            exerciseIdsForDay.push(exercise._id);
          }

          const day = new Day({ ...dayData, exercises: exerciseIdsForDay });
          await day.save();
          dayIds.push(day._id);
        }

        const routine = new Routine({ userId, name, days: dayIds });
        await routine.save();

        const populatedRoutine = await Routine.findById(routine._id)
          .populate({
            path: "days",
            populate: {
              path: "exercises",
              populate: { path: "videos" },
            },
          })
          .lean();

        if (!populatedRoutine) {
          return res.status(500).json({ message: "Error al crear rutina" });
        }

        res.status(201).json(populatedRoutine);
      } catch (error) {
        res.status(500).json({ message: "Error al crear rutina", error });
      }
      break;

    default:
      res.status(405).json({ message: "Método no permitido" });
      break;
  }
}