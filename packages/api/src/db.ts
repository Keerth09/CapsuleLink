import dns from "node:dns";
import mongoose from "mongoose";
import { config } from "./config.js";

dns.setServers(["1.1.1.1"]);

export async function connectDatabase(): Promise<void> {
  if (!config.mongodbUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  await mongoose.connect(config.mongodbUri);
  console.log("MongoDB connected");
}