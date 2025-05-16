import { NextApiRequest, NextApiResponse } from "next";
import {dbConnect} from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import User from "@/models/Users";
import Routine from "@/models/Routine";
import { IDay } from "@/models/Day";
import { IExercise } from "@/models/Exercise";
import { IVideo } from "@/models/Video";

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
  const { clientId } = req.query;
  switch (req.method) {
    case "GET":
      try {
        const user = await User.findById(userId).lean();
        if (!user) {
          return res.status(404).json({ message: "Usuario no encontrado" });
        }
        if (user.role !== "coach") {
          return res.status(403).json({ message: "Solo los coaches pueden ver rutinas de clientes" });
        }
        ///coachId: user._id, -> implementacion a futuro
        const routines = await Routine.find({
          clientId,
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
              circuitId: e.circuitId,
            })),
          })),
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
        const client = await User.findOne({
          _id: clientId,
          coachId: user._id,
          role: "user",
        }).select("username email goals notes");
        res.status(200).json({client,serializedRoutines});
        return res.status(200).json(client);
      } catch (error) {
        return res.status(500).json({ message: "Error al obtener rutinas de cliente", error });
      }
    case "POST":
      try {
        const { routineId } = req.body;
        if (!routineId) {
          return res.status(400).json({ message: "El ID de la rutina es requerido" });
        }
        const user = await User.findById(userId).lean();
        if (!user) {
          return res.status(404).json({ message: "Usuario no encontrado" });
        }
        if (user.role !== "coach") {
          return res.status(403).json({ message: "Solo los coaches pueden ver rutinas de clientes" });
        }
        const client = await User.findOne({
          _id: clientId,
          coachId: user._id,
          role: "user",
        });
        if (!client) {
          return res.status(404).json({ message: "Cliente no encontrado o no asignado" });
        }
        // TODO: Implementar lógica para asignar rutina (requiere modelo Routine)
        // Ejemplo: const routine = await RoutineModel.findById(routineId);
        // if (!routine) return res.status(404).json({ message: "Rutina no encontrada" });
        // routine.clientId = clientId;
        // await routine.save();
        res.json({ message: "Rutina asignada (placeholder)" }); // Placeholder
      } catch (error) {
        return res.status(500).json({ message: "Error al asignar rutina a cliente", error });
      }
    case "PUT":
        try {
          const { goals, notes } = req.body;
          const user = await User.findById(userId).lean();
          if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
          }
          if (user.role !== "coach") {
            return res.status(403).json({ message: "Solo los coaches pueden ver rutinas de clientes" });
          }
          const client = await User.findOne({
            _id: clientId,
            coachId: user._id,
            role: "user",
          });
          if (!client) {
            return res.status(404).json({ message: "Cliente no encontrado o no asignado" });
          }
          if (goals !== undefined) {
            if (!Array.isArray(goals)) {
              return res.status(400).json({ message: "Los objetivos deben ser un array" });
            }
            client.goals = goals;
          }
          if (notes !== undefined) {
            client.notes = notes;
          }
      
          await client.save();
          res.status(201).json(client);
        } catch (error) {
          return res.status(500).json({ message: "Error al actualizar cliente", error });
        }
    default:
      return res.status(405).json({ message: "Método no permitido" });
  }
}