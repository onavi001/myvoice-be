import type { NextApiRequest, NextApiResponse } from "next";
import {dbConnect} from "../../lib/mongodb";
import User from "../../models/Users";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET || "my-super-secret-key"; // ¡Guarda esto en .env.local!

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  await dbConnect();
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: "User not found" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ userId: user._id, email: user.email }, SECRET_KEY, { expiresIn: "7d" });

  res.status(200).json({ message: "Login successful", token, user });
}