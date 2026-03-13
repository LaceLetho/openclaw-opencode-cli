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

      // Get session info
      const sessionResult = await client.session.get({ path: { id: task.sessionId } });

      if (sessionResult.error) {
        console.error("Error getting session:", sessionResult.error);
        process.exit(1);
      }

      const session = sessionResult.data;
      if (!session) {
        console.error("Session not found");
        process.exit(1);
      }

      // Get session status
      const statusResult = await client.session.status({ query: { directory: session.directory } });
      const sessionStatus = statusResult.data?.[task.sessionId];

      console.log(`Task: ${taskId}`);
      console.log(`Session ID: ${session.id}`);
      console.log(`Title: ${session.title}`);
      console.log(`Directory: ${session.directory}`);
      console.log(`Status: ${sessionStatus?.type || "unknown"}`);
      console.log(`Created: ${task.createdAt.toISOString()}`);

      if (task.completedAt) {
        console.log(`Completed: ${task.completedAt.toISOString()}`);
      }
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
