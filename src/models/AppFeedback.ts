import { Schema, model, Document, Types } from "mongoose";

export type FeedbackCategory = "idea" | "bug" | "help" | "praise" | "other";

export interface IAppFeedback extends Document {
  userId: Types.ObjectId;
  category: FeedbackCategory;
  message: string;
  /** 1–5 opcional: qué tan contento está con la app */
  rating?: number;
  platform?: string;
  appVersion?: string;
  status: "new" | "read" | "replied";
  createdAt: Date;
}

const AppFeedbackSchema = new Schema<IAppFeedback>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: {
      type: String,
      enum: ["idea", "bug", "help", "praise", "other"],
      required: true,
    },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    rating: { type: Number, min: 1, max: 5 },
    platform: { type: String, maxlength: 32 },
    appVersion: { type: String, maxlength: 32 },
    status: { type: String, enum: ["new", "read", "replied"], default: "new" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AppFeedbackSchema.index({ createdAt: -1 });
AppFeedbackSchema.index({ status: 1, createdAt: -1 });

export default model<IAppFeedback>("AppFeedback", AppFeedbackSchema);
