import { Schema, model, Document, Model, Types } from "mongoose";

interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: "user" | "coach";
  goals?: string[];
  notes?: string;
  coachId?: Types.ObjectId;
  specialties?: string;
  bio?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
}

const UserSchema: Schema = new Schema<IUser>({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "coach"], default: "user", required: true },
  goals: [{ type: String }],
  notes: { type: String },
  coachId: { type: Schema.Types.ObjectId, ref: "User" },
  specialties: [{ type: String }],
  bio: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

let UserModel: Model<IUser>;

try {
  UserModel = model<IUser>("User", UserSchema);
} catch {
  UserModel = model<IUser>("User", UserSchema, undefined, { overwriteModels: true });
}

export default UserModel;