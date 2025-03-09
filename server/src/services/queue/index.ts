import { Queue, Worker } from "bullmq";
import { processMention } from "./processors.js";

// Redis connection config
const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};

// Create queues
export const mentionsQueue = new Queue("mentions", { connection });

// Initialize workers
export const initializeWorkers = () => {
  new Worker("mentions", processMention, { connection });
};

// Helper to add mention to queue
export const queueMention = async (mention: {
  username: string;
  text: string;
  id: string;
}) => {
  await mentionsQueue.add("process-mention", mention, {
    jobId: mention.id, // Use tweet ID as job ID to prevent duplicates
    removeOnComplete: true,
  });
};
