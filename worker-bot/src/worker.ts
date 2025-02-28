import { Job, Worker } from "bullmq";
import { redis } from "./redis";
import {
  IPerformSearchTaskContext,
  performItemSearch,
} from "./tasks/perform-search";
import {
  IRequestUserApprovalTaskContext,
  requestUserApproval,
} from "./tasks/request-user-approval";
import { handleAsyncCallback, IHandleAsyncCallback } from "./tasks/handle-async-callback";

const worker = new Worker(
  "taskQueue",
  async (job) => {
    try {
      console.log(`Worker processing job ${job.id}: ${job.name}`);

      if (job.name === "performItemSearch") {
        await performItemSearch(job as Job<IPerformSearchTaskContext>);
      } else if (job.name === "requestUserApproval") {
        await requestUserApproval(job as Job<IRequestUserApprovalTaskContext>);
      } else if (job.name === "handleAsyncCallback") {
        await handleAsyncCallback(job as Job<IHandleAsyncCallback>);
      }else {
        throw new Error(`Unknown job type: ${job.name}`);
      }

      console.log(`Job ${job.id} (${job.name}) completed.`);
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error);
    }
  },
  { connection: redis }
);

// Graceful Shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down worker...");
  await worker.close();
  process.exit(0);
});

console.log("Worker started, waiting for jobs...");
