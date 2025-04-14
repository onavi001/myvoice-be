import mongoose, { Schema, Document } from "mongoose";

export interface ISubscription extends Document {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

const SubscriptionSchema = new Schema<ISubscription>({
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
});

export default mongoose.models.Subscription || mongoose.model<ISubscription>("Subscription", SubscriptionSchema);