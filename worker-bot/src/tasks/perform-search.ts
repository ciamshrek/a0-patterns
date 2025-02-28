import { Job } from "bullmq";
import { IAuthenticatedTaskContext } from "./i-authenticated-task-context";
import { taskQueue } from "../queue";

export interface IPerformSearchTaskContext extends IAuthenticatedTaskContext {
    query: string
}

/**
 * Finds an item for the user, with some random probability (mocked to always succeed).
 * If successful, it updates the job's result and proceeds with the next action.
 */
export async function performItemSearch(job: Job<IPerformSearchTaskContext>) {
    console.log(`Processing job ${job.id}: Performing item search for user ${job.data.user_id}`);

    // Mock probability-based item search (100% success for this mock)
    const found = Math.random() > -1; // Set to true to ensure it always finds an item

    if (found) {
        const item = {
            name: "Mock Item",
            description: "This is a randomly found item for testing purposes.",
        };

        console.log(`Item found: ${item.name} - ${item.description}`);
        
        await taskQueue.add("requestUserApproval", {
            user_id: job.data.user_id,
            found_item: item,
        });

        return { found: true, item };
    } else {

        console.log("No item found in this search attempt.");
        return { found: false };
    }
}
