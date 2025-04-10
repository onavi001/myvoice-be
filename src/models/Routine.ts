import { Schema, model, Model, Types } from "mongoose";
import { IDay } from "./Day";

export interface IRoutine {
  userId: Types.ObjectId;
  name: string;
  days: Types.ObjectId[] | IDay[];
  createdAt: Date;
  updatedAt: Date;
}

// Tipo plano para el frontend
export interface RoutineData {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  days: {
    _id: Types.ObjectId;
    dayName: string;
    musclesWorked: string[];
    warmupOptions: string[];
    explanation: string;
    exercises: {
      _id: Types.ObjectId;
      name: string;
      muscleGroup: string[];
      sets: number;
      reps: number;
      repsUnit: "count" | "seconds";
      weightUnit: "kg" | "lb";
      weight: number;
      rest: string;
      tips: string[];
      completed: boolean;
      videos: { _id: Types.ObjectId; url: string; isCurrent: boolean }[];
      notes?: string;
      circuitId?: string;
    }[];
  }[];
  createdAt: string;
  updatedAt: string;
}

const RoutineSchema: Schema = new Schema<IRoutine>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  days: [{ type: Schema.Types.ObjectId, ref: "Day" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

let RoutineModel: Model<IRoutine>;

try {
  RoutineModel = model<IRoutine>("Routine", RoutineSchema);
} catch {
  RoutineModel = model<IRoutine>("Routine", RoutineSchema, undefined, { overwriteModels: true });
}

export default RoutineModel;