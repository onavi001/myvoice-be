// Centralized configuration for environment variables and constants

export const MONGODB_URI: string = process.env.MONGO_URI || "mongodb://localhost:27017/myvoice";
export const EMAIL_USER: string = process.env.EMAIL_USER || "";
export const EMAIL_PASS: string = process.env.EMAIL_PASS || "";
export const JWT_SECRET: string = process.env.JWT_SECRET || "my-super-secret-key";

// Add more configuration constants as needed
