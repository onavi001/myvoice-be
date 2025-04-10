import { Schema, model, Document, Model } from "mongoose";

interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
}

const UserSchema: Schema = new Schema<IUser>({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
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
