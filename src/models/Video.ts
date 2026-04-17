import { Schema, model, Model, Types } from "mongoose";

export interface IVideo {
  _id: Types.ObjectId;
  url: string;
  isCurrent: boolean;
}

const VideoSchema: Schema = new Schema<IVideo>({
  url: { type: String, required: true },
  isCurrent: { type: Boolean, default: false },
});

export default model<IVideo>("Video", VideoSchema);
