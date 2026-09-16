import dns from "node:dns";
import mongoose from "mongoose";

dns.setServers(["1.1.1.1"]);

export async function connectDatabase(): Promise<void> {
  const mongodbUri = process.env.MONGODB_URI;

  if (!mongodbUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  await mongoose.connect(mongodbUri);
  console.log("Worker MongoDB connected");
}