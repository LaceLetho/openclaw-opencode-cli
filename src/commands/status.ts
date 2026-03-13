import { Command } from "commander";
import { createClient } from "../client.js";
import { getTask } from "../utils/store.js";
import { logger } from "../utils/logger.js";

export const statusCommand = new Command("status")
  .description("Get task status")
  .argument("<taskId>", "Task ID to check")
  .action(async (taskId: string) => {
    try {
      logger.info("Status command started", { taskId });

      const task = getTask(taskId);

      if (!task) {
        logger.error("Task not found", { taskId });
        console.error(`Task not found: ${taskId}`);
        process.exit(1);
      }

      logger.debug("Task found in store", { taskId, sessionId: task.sessionId, status: task.status });

      const client = createClient({
        url: process.env.OPENCODE_URL,
        username: process.env.OPENCODE_USERNAME,
        password: process.env.OPENCODE_PASSWORD,
      });

      // Get session info
      logger.debug("Fetching session info", { sessionId: task.sessionId });
      const sessionResult = await client.session.get({ sessionID: task.sessionId });

      if (sessionResult.error) {
        logger.error("Failed to get session", { taskId, sessionId: task.sessionId, error: sessionResult.error });
        console.error("Error getting session:", sessionResult.error);
        process.exit(1);
      }

      const session = sessionResult.data;
      if (!session) {
        logger.error("Session not found", { taskId, sessionId: task.sessionId });
        console.error("Session not found");
        process.exit(1);
      }

      // Get session status
      const statusResult = await client.session.status({ directory: session.directory });
      const sessionStatus = statusResult.data?.[task.sessionId];

      logger.info("Task status retrieved", {
        taskId,
        sessionId: session.id,
        status: sessionStatus?.type || "unknown",
      });

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
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Status command failed", { taskId, error: errorMessage });
      console.error("Error:", errorMessage);
      process.exit(1);
    }
  });
