import { Schema, model, Model, Types } from "mongoose";
import { IExercise } from "./Exercise";

export interface IDay {
  _id: Types.ObjectId;
  dayName: string;
  musclesWorked: string[];
  warmupOptions: string[];
  explanation: string;
  exercises: Types.ObjectId[] | IExercise[];
}

const DaySchema: Schema = new Schema<IDay>({
  dayName: { type: String, required: true },
  musclesWorked: [String],
  warmupOptions: [String],
  explanation: String,
  exercises: [{ type: Schema.Types.ObjectId, ref: "Exercise" }],
});

let DayModel: Model<IDay>;

try {
  DayModel = model<IDay>("Day", DaySchema);
} catch {
  DayModel = model<IDay>("Day", DaySchema, undefined, { overwriteModels: true });
}

export default DayModel;