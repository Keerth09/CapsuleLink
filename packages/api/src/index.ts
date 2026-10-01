import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";

import authRouter from "./routes/auth.js";
import identityRouter from "./routes/identity.js";
import beneficiaryRouter from "./routes/beneficiary.js";
import capsulesRouter from "./routes/capsules.js";

import { configureModelIndexes } from "./models/indexes.js";
import { connectDatabase } from "./db.js";

const app = express();
const PORT = 4000;

configureModelIndexes();

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/identity", identityRouter);
app.use("/api/v1/beneficiary", beneficiaryRouter);
app.use("/api/v1/capsules", capsulesRouter);

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

