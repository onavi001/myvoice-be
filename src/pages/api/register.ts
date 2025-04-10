import type { NextApiRequest, NextApiResponse } from "next";
import {dbConnect} from "../../lib/mongodb";
import User from "../../models/Users";
import bcrypt from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  await dbConnect();
  const { username, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hashedPassword });

  try {
    await user.save();
    res.status(201).json({ message: "User created", userId: user._id });
  } catch (error) {
    res.status(500).json({ message: "Error creating user", error });
  }
}