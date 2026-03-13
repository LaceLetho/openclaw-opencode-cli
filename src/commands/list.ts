import { Command } from "commander";
import { listTasks, clearCompletedTasks } from "../utils/store.js";
import { logger } from "../utils/logger.js";

export const listCommand = new Command("list")
  .description("List all tasks")
  .option("--clear", "Clear completed tasks")
  .action((options) => {
    try {
      logger.info("List command started", { clear: options.clear });

      if (options.clear) {
        const cleared = clearCompletedTasks();
        logger.info("Cleared completed tasks", { cleared });
        console.log(`Cleared ${cleared} completed tasks`);
        return;
      }

      const tasks = listTasks();

      logger.info("Tasks listed", { total: tasks.length });

      if (tasks.length === 0) {
        console.log("No tasks found");
        return;
      }

      console.log(`\nTotal tasks: ${tasks.length}\n`);

      tasks.forEach((task) => {
        const statusIcon = task.status === "completed" ? "✓" : task.status === "failed" ? "✗" : "○";
        console.log(`${statusIcon} ${task.taskId} - ${task.status}`);
        console.log(`  Prompt: ${task.prompt.substring(0, 60)}${task.prompt.length > 60 ? "..." : ""}`);
        console.log(`  Created: ${task.createdAt.toLocaleString()}`);
        if (task.completedAt) {
          console.log(`  Completed: ${task.completedAt.toLocaleString()}`);
        }
        console.log();
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("List command failed", { error: errorMessage });
      console.error("Error:", errorMessage);
      process.exit(1);
    }
  });
