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

let VideoModel: Model<IVideo>;

try {
  VideoModel = model<IVideo>("Video", VideoSchema);
} catch {
  VideoModel = model<IVideo>("Video", VideoSchema, undefined, { overwriteModels: true });
}

export default VideoModel;