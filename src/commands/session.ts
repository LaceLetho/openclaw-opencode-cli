import { Command } from "commander";
import { getActiveSession, clearActiveSession } from "../utils/store.js";

export const sessionCommand = new Command("session")
  .description("Manage the active OpenCode session")
  .option("-c, --clear", "Clear the active session (next task will create a new one)")
  .action((options) => {
    if (options.clear) {
      clearActiveSession();
      console.log("Active session cleared. Next task will create a new session.");
      return;
    }

    const session = getActiveSession();
    if (session) {
      console.log("Active session:");
      console.log(`  Session ID: ${session.sessionId}`);
      console.log(`  Directory: ${session.directory || "(not set)"}`);
      console.log(`  Created at: ${session.createdAt.toLocaleString()}`);
    } else {
      console.log("No active session. Next task will create a new session.");
    }
  });
