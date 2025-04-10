import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import {dbConnect} from "../../lib/mongodb";
import User from "../../models/Users";

const SECRET_KEY = process.env.JWT_SECRET || "my-super-secret-key";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const token = req.headers.authorization?.split(" ")[1]; // "Bearer <token>"
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    await dbConnect();
    const decoded = jwt.verify(token, SECRET_KEY) as { userId: string; email: string };
    const user = await User.findById(decoded.userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user: { _id: user._id, username: user.username, email: user.email } });
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}