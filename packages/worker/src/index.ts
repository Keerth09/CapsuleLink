import "dotenv/config";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { connectDatabase } from "./db.js";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is not configured");
}

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

async function startWorker(): Promise<void> {
  await connectDatabase();

  const worker = new Worker(
    "capsule-release",
    async (job) => {
      console.log(`Processing job: ${job.name}`, job.data);
    },
    {
      connection,
    },
  );

  worker.on("completed", (job) => {
    console.log(`Job completed: ${job.id}`);
  });

  worker.on("failed", (job, error) => {
    console.error(`Job failed: ${job?.id}`, error.message);
  });

  console.log("CapsuleLink Worker running");
}

startWorker().catch((error) => {
  console.error("Failed to start CapsuleLink Worker:", error);
  process.exit(1);
});