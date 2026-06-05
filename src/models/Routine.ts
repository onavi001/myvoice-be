import { Schema, model, Model, Types } from "mongoose";
import { IDay } from "./Day";

export interface IRoutine {
  userId: Types.ObjectId;
  name: string;
  couchId?: Types.ObjectId;
  coachMessage?: string;
  assignmentSeenAt?: Date;
  days: Types.ObjectId[] | IDay[];
  createdAt: Date;
  updatedAt: Date;
}

const RoutineSchema: Schema = new Schema<IRoutine>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  couchId: { type: Schema.Types.ObjectId, ref: "User"},
  coachMessage: { type: String, maxlength: 500 },
  assignmentSeenAt: { type: Date },
  name: { type: String, required: true },
  days: [{ type: Schema.Types.ObjectId, ref: "Day" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default model<IRoutine>("Routine", RoutineSchema);
