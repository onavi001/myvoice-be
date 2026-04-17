import { Schema, model, Model, Types } from "mongoose";

export interface IProgress {
  userId: Schema.Types.ObjectId;
  routineId: Schema.Types.ObjectId;
  routineName: string;
  dayId: Schema.Types.ObjectId;
  dayName: string;
  exerciseId: Schema.Types.ObjectId;
  exerciseName: string;
  sets: number;
  reps: number;
  repsUnit: "count" | "seconds";
  weightUnit: "kg" | "lb";
  weight: number;
  notes: string;
  date: Date;
  completed: boolean;
}

export interface ProgressData {
  _id: Types.ObjectId;
  userId: string;
  routineId: string;
  routineName: string;
  dayId: string;
  dayName: string;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  repsUnit: "count" | "seconds";
  weightUnit: "kg" | "lb";
  weight: number;
  notes: string;
  date: string;
  completed: boolean;
}

const ProgressSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  routineId: { type: Schema.Types.ObjectId, ref: "Routine", required: true },
  routineName: { type: String, required: true },
  dayId: { type: Schema.Types.ObjectId, ref: "Day", required: true },
  dayName: { type: String, required: true },
  exerciseId: { type: Schema.Types.ObjectId, ref: "Exercise", required: true },
  exerciseName: { type: String, required: true },
  sets: { type: Number, required: true },
  reps: { type: Number, required: true },
  repsUnit: { type: String, enum: ["count", "seconds"], default: "count" },
  weightUnit: { type: String, enum: ["kg", "lb"], default: "kg" },
  weight: { type: Number, default: 0 },
  notes: { type: String, default: "" },
  date: { type: Date, default: Date.now },
  completed: { type: Boolean, default: false },
});

let ProgressModel: Model<IProgress>;

try {
  ProgressModel = model<IProgress>("Progress", ProgressSchema);
} catch {
  ProgressModel = model<IProgress>("Progress", ProgressSchema, undefined, { overwriteModels: true });
}

export default ProgressModel;