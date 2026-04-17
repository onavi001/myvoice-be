import mongoose from "mongoose";
import { MONGO_URI } from "../config";

export const connectDB = async () => {
  if (!MONGO_URI) throw new Error("Please define the MONGO_URI environment variable");
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};
