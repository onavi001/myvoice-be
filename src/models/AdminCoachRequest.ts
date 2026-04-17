import mongoose, { Document, Schema } from "mongoose";

export interface IAdminCoachRequest extends Document {
  userId: mongoose.Types.ObjectId;
  message: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}

const adminCoachRequestSchema = new Schema<IAdminCoachRequest>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true, maxlength: 500 },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.AdminCoachRequest || mongoose.model<IAdminCoachRequest>("AdminCoachRequest", adminCoachRequestSchema);