import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { dbConnect } from '../../../lib/mongodb';
import Progress from '../../../models/Progress';
import Routine from '../../../models/Routine';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No autenticado' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'my-super-secret-key') as { userId: string };
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }
  
  const userId = decoded.userId;

  switch (req.method) {
    case 'GET':
      try {
        const { routineId, startDate, endDate } = req.query;
        const query: Record<string, unknown> = { userId: new ObjectId(userId) };
        if (routineId) {
          query.routineId = new ObjectId(routineId as string);
        }
        if (startDate && endDate) {
          query.date = {
            $gte: new Date(startDate as string),
            $lte: new Date(endDate as string),
          };
        }
        const progress = await Progress.find(query).lean();
        const serializedProgress = progress.map((p) => ({
          _id: p._id,
          userId: p.userId,
          routineId: p.routineId,
          exerciseId: p.exerciseId,
          routineName: p.routineName,
          dayName: p.dayName,
          exerciseName: p.exerciseName,
          sets: p.sets,
          reps: p.reps,
          weight: p.weight,
          weightUnit: p.weightUnit,
          completed: p.completed,
          date: p.date.toISOString(),
          notes: p.notes,
        }));

        res.status(200).json(serializedProgress);
      } catch (error) {
        console.error('Error al obtener progreso:', error);
        res.status(500).json({ message: 'Error al obtener progreso', error });
      }
      break;

    case 'POST':
      try {
        const {
          routineId,
          exerciseId,
          routineName,
          dayName,
          dayId,
          exerciseName,
          sets,
          reps,
          weight,
          weightUnit,
          completed,
          date,
          notes,
        } = req.body;

        // Validar campos requeridos
        if (!routineId || !exerciseId || !routineName || !dayName || !exerciseName || !sets || !reps || !dayId) {
          return res.status(400).json({ message: 'Faltan campos requeridos' });
        }

        // Verificar que la rutina existe
        const routine = await Routine.findOne({ _id: new ObjectId(routineId), userId: new ObjectId(userId) });
        if (!routine) {
          return res.status(404).json({ message: 'Rutina no encontrada' });
        }

        // Normalizar la fecha al inicio del día
        const inputDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
        const endOfDay = new Date(startOfDay);
        endOfDay.setHours(23, 59, 59, 999);

        // Verificar si ya existe un progreso para el mismo exerciseId, routineId, userId y día
        const existingProgress = await Progress.findOne({
          userId: new ObjectId(userId),
          routineId: new ObjectId(routineId),
          exerciseId: new ObjectId(exerciseId),
          date: { $gte: startOfDay, $lte: endOfDay },
        });

        if (existingProgress) {
          return res.status(409).json({
            message: 'Ya existe un progreso para este ejercicio en este día',
            existingProgress: {
              _id: existingProgress._id.toString(),
              exerciseName: existingProgress.exerciseName,
              date: existingProgress.date.toISOString(),
            },
          });
        }

        const progressEntry = new Progress({
          userId: new ObjectId(userId),
          routineId: new ObjectId(routineId),
          exerciseId: new ObjectId(exerciseId),
          dayId: new ObjectId(dayId),
          routineName,
          dayName,
          exerciseName,
          sets,
          reps,
          weight: weight || 0,
          weightUnit: weightUnit || 'kg',
          completed: completed || false,
          date: inputDate,
          notes: notes || '',
        });

        await progressEntry.save();

        res.status(201).json({
          _id: progressEntry._id.toString(),
          userId: progressEntry.userId.toString(),
          routineId: progressEntry.routineId.toString(),
          exerciseId: progressEntry.exerciseId.toString(),
          routineName: progressEntry.routineName,
          dayName: progressEntry.dayName,
          exerciseName: progressEntry.exerciseName,
          sets: progressEntry.sets,
          reps: progressEntry.reps,
          weight: progressEntry.weight,
          weightUnit: progressEntry.weightUnit,
          completed: progressEntry.completed,
          date: progressEntry.date.toISOString(),
          notes: progressEntry.notes,
        });
      } catch (error) {
        console.error('Error al agregar progreso:', error);
        res.status(500).json({ message: 'Error al agregar progreso', error });
      }
      break;

    case 'PUT':
      try {
        const {
          _id,
          sets,
          reps,
          weight,
          weightUnit,
          completed,
          date,
          notes,
        } = req.body;

        // Validar campos requeridos
        if (!_id) {
          return res.status(400).json({ message: 'Falta el ID del progreso' });
        }

        // Verificar que el progreso existe y pertenece al usuario
        const progress = await Progress.findOne({ _id: new ObjectId(_id), userId: new ObjectId(userId) });
        if (!progress) {
          return res.status(404).json({ message: 'Progreso no encontrado o no autorizado' });
        }

        // Normalizar la fecha al inicio del día si se proporciona
        let inputDate = progress.date;
        if (date) {
          inputDate = new Date(date);
          const startOfDay = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
          const endOfDay = new Date(startOfDay);
          endOfDay.setHours(23, 59, 59, 999);

          // Verificar si cambiar la fecha crearía un duplicado
          const conflictingProgress = await Progress.findOne({
            _id: { $ne: new ObjectId(_id) },
            userId: new ObjectId(userId),
            routineId: progress.routineId,
            exerciseId: progress.exerciseId,
            date: { $gte: startOfDay, $lte: endOfDay },
          });

          if (conflictingProgress) {
            return res.status(409).json({
              message: 'Ya existe un progreso para este ejercicio en el día especificado',
              existingProgress: {
                _id: conflictingProgress._id.toString(),
                exerciseName: conflictingProgress.exerciseName,
                date: conflictingProgress.date.toISOString(),
              },
            });
          }
        }

        // Actualizar solo los campos proporcionados
        const updateFields: Partial<typeof Progress.schema.obj> = {};
        if (sets !== undefined) updateFields.sets = sets;
        if (reps !== undefined) updateFields.reps = reps;
        if (weight !== undefined) updateFields.weight = weight;
        if (weightUnit) updateFields.weightUnit = weightUnit;
        if (completed !== undefined) updateFields.completed = completed;
        if (date) updateFields.date = inputDate;
        if (notes !== undefined) updateFields.notes = notes;

        const updatedProgress = await Progress.findByIdAndUpdate(
          _id,
          { $set: updateFields },
          { new: true, lean: true }
        );

        if (!updatedProgress) {
          return res.status(404).json({ message: 'Error al actualizar progreso' });
        }

        res.status(200).json({
          _id: updatedProgress._id.toString(),
          userId: updatedProgress.userId.toString(),
          routineId: updatedProgress.routineId.toString(),
          exerciseId: updatedProgress.exerciseId.toString(),
          routineName: updatedProgress.routineName,
          dayName: updatedProgress.dayName,
          exerciseName: updatedProgress.exerciseName,
          sets: updatedProgress.sets,
          reps: updatedProgress.reps,
          weight: updatedProgress.weight,
          weightUnit: updatedProgress.weightUnit,
          completed: updatedProgress.completed,
          date: updatedProgress.date.toISOString(),
          notes: updatedProgress.notes,
        });
      } catch (error) {
        console.error('Error al actualizar progreso:', error);
        res.status(500).json({ message: 'Error al actualizar progreso', error });
      }
    break;
    default:
      res.status(405).json({ message: 'Método no permitido' });
      break;
  }
}