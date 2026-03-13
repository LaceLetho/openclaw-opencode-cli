import { Command } from "commander";
import { getActiveSession, clearActiveSession } from "../utils/store.js";
import { logger } from "../utils/logger.js";

export const sessionCommand = new Command("session")
  .description("Manage the active OpenCode session")
  .option("-c, --clear", "Clear the active session (next task will create a new one)")
  .action((options) => {
    try {
      logger.info("Session command started", { clear: options.clear });

      if (options.clear) {
        clearActiveSession();
        logger.info("Active session cleared");
        console.log("Active session cleared. Next task will create a new session.");
        return;
      }

      const session = getActiveSession();
      if (session) {
        logger.info("Active session retrieved", {
          sessionId: session.sessionId,
          directory: session.directory,
        });
        console.log("Active session:");
        console.log(`  Session ID: ${session.sessionId}`);
        console.log(`  Directory: ${session.directory || "(not set)"}`);
        console.log(`  Created at: ${session.createdAt.toLocaleString()}`);
      } else {
        logger.info("No active session found");
        console.log("No active session. Next task will create a new session.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Session command failed", { error: errorMessage });
      console.error("Error:", errorMessage);
      process.exit(1);
    }
  });
