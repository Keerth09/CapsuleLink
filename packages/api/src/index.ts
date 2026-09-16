import express from "express";
import mongoose from "mongoose";
import { configureModelIndexes } from "./models/indexes.js";
import { connectDatabase } from "./db.js";

const app = express();
const PORT = 4000;

configureModelIndexes();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.get("/health/ready", (_req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.status(200).json({
      status: "ready",
      database: "connected",
    });
    return;
  }

  res.status(503).json({
    status: "not_ready",
    database: "disconnected",
  });
});

async function startServer(): Promise<void> {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`CapsuleLink API running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start CapsuleLink API:", error);
  process.exit(1);
});