import { Schema, model, Document, Model, Types } from "mongoose";

interface ICoachRequest extends Document {
  userId: Types.ObjectId;
  coachId: Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
}

const CoachRequestSchema: Schema = new Schema<ICoachRequest>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  coachId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending", required: true },
  createdAt: { type: Date, default: Date.now },
});

let CoachRequestModel: Model<ICoachRequest>;

try {
  CoachRequestModel = model<ICoachRequest>("CoachRequest", CoachRequestSchema);
} catch {
  CoachRequestModel = model<ICoachRequest>("CoachRequest", CoachRequestSchema, undefined, { overwriteModels: true });
}

export default CoachRequestModel;