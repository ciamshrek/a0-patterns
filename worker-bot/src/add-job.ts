import { taskQueue } from "./queue";
import { IPerformSearchTaskContext } from "./tasks/perform-search";


// Function to add the first job
async function bootstrapJob() {
    try {
        console.log("🚀 Bootstrapping the first job...");
        console.log(process.argv);
        await taskQueue.add("performItemSearch", {
            user_id: process.argv[2],
            query: "some item",
        } satisfies IPerformSearchTaskContext);

        console.log("✅ First job added to the queue: performItemSearch");
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to add job:", error);
        process.exit(1);
    }
}

// Run the job bootstrapping function
bootstrapJob();
