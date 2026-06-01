import { Schema, model, Document, Model, Types } from "mongoose";
import type { TrainingProfile } from "../types/trainingProfile";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: "user" | "coach" | "admin";
  goals?: string[];
  notes?: string;
  coachId?: Types.ObjectId;
  specialties?: string;
  bio?: string;
  trainingProfile?: TrainingProfile;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
}

const TrainingProfileSchema = new Schema(
  {
    biologicalSex: { type: String, enum: ["masculino", "femenino"], required: true },
    heightCm: { type: Number, required: true, min: 120, max: 230 },
    weightKg: { type: Number, required: true, min: 30, max: 250 },
    sessionDurationMin: { type: Number, required: true, min: 20, max: 180 },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema: Schema = new Schema<IUser>({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "coach", "admin"], default: "user", required: true },
  goals: [{ type: String }],
  notes: { type: String },
  coachId: { type: Schema.Types.ObjectId, ref: "User" },
  specialties: [{ type: String }],
  bio: { type: String },
  trainingProfile: { type: TrainingProfileSchema, default: undefined },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export default model<IUser>("User", UserSchema);
