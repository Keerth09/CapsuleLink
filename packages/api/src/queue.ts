import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { config } from "./config.js";

if (!config.redisUrl) {
  throw new Error("REDIS_URL is not configured");
}

export const redisConnection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

export const capsuleQueue = new Queue("capsule-release", {
  connection: redisConnection,
});
