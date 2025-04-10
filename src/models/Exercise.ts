import { Schema, model, Model, Types } from "mongoose";
import { IVideo } from "./Video";

export interface IExercise {
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
  videos: IVideo[] | Types.ObjectId[];
  notes?: string;
  circuitId?: string;
}

const ExerciseSchema: Schema = new Schema<IExercise>({
  name: { type: String, required: true },
  muscleGroup: [String],
  sets: Number,
  reps: Number,
  repsUnit: { type: String, enum: ["count", "seconds"], default: "count" },
  weight: Number,
  weightUnit: { type: String, enum: ["kg", "lb"], default: "kg" },
  rest: String,
  tips: [String],
  completed: { type: Boolean, default: false },
  videos: [{ type: Schema.Types.ObjectId, ref: "Video" }],
  notes: String,
  circuitId: String,
});

let ExerciseModel: Model<IExercise>;

try {
  ExerciseModel = model<IExercise>("Exercise", ExerciseSchema);
} catch {
  ExerciseModel = model<IExercise>("Exercise", ExerciseSchema, undefined, { overwriteModels: true });
}

export default ExerciseModel;