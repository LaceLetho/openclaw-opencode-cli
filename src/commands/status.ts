import { Command } from "commander";
import { createClient } from "../client.js";
import { getTask } from "../utils/store.js";

export const statusCommand = new Command("status")
  .description("Get task status")
  .argument("<taskId>", "Task ID to check")
  .action(async (taskId: string) => {
    try {
      const task = getTask(taskId);

      if (!task) {
        console.error(`Task not found: ${taskId}`);
        process.exit(1);
      }

      const client = createClient({
        url: process.env.OPENCODE_URL,
        username: process.env.OPENCODE_USERNAME,
        password: process.env.OPENCODE_PASSWORD,
      });

      const session = await client.sessions.get(task.sessionId);

      console.log(`Task: ${taskId}`);
      console.log(`Status: ${session.status}`);
      console.log(`Created: ${task.createdAt.toISOString()}`);

      if (task.completedAt) {
        console.log(`Completed: ${task.completedAt.toISOString()}`);
      }

      if (session.result) {
        console.log("\nResult:");
        console.log(session.result);
      }

      if (session.error) {
        console.error("\nError:");
        console.error(session.error);
      }
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
