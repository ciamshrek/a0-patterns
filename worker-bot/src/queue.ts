import { Queue } from "bullmq";
import { IPerformSearchTaskContext } from "./tasks/perform-search";
import { IRequestUserApprovalTaskContext } from "./tasks/request-user-approval";
import { redis } from "./redis";
import { IHandleAsyncCallback } from "./tasks/handle-async-callback";

// Single Queue for Both Tasks
export const taskQueue = new Queue<IPerformSearchTaskContext | IRequestUserApprovalTaskContext | IHandleAsyncCallback>("taskQueue", {
    connection: redis,
});