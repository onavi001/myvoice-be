import { Schema, model, Model, Types } from "mongoose";

export interface IProgress {
  userId: Schema.Types.ObjectId;
  name: string;
  sets: number;
  reps: number;
  repsUnit: "count" | "seconds";
  weightUnit: "kg" | "lb";
  weight: number;
  notes: string;
  date: Date;
}
export interface ProgressData {
  _id: Types.ObjectId;
  userId: string;
  name: string;
  sets: number;
  reps: number;
  repsUnit: "count" | "seconds";
  weightUnit: "kg" | "lb";
  weight: number;
  notes: string;
  date: Date;
}

const ProgressSchema: Schema = new Schema<IProgress>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  sets: { type: Number, required: true },
  reps: { type: Number, required: true },
  repsUnit: { type: String, enum: ["count", "seconds"], default : "count" },
  weightUnit: { type: String, enum: ["kg", "lb"], default: "kg" },
  weight: { type: Number, default: 0 },
  notes: { type: String, default: "" },
  date: { type: Date, default: Date.now },
});

let ProgressModel: Model<IProgress>;

try {
  ProgressModel = model<IProgress>("Progress", ProgressSchema);
} catch {
  ProgressModel = model<IProgress>("Progress", ProgressSchema, undefined, { overwriteModels: true });
}

export default ProgressModel;
