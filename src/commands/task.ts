import { Command } from "commander";
import { createClient, dispatchTask } from "../client.js";
import { getOpenClawConfig, sendCallback, formatCallbackMessage } from "../openclaw.js";
import { storeTask } from "../utils/store.js";

export const taskCommand = new Command("task")
  .description("Dispatch a task to OpenCode")
  .argument("<prompt>", "Task prompt to send to OpenCode")
  .option("-c, --callback-url <url>", "OpenClaw callback URL")
  .option("-a, --agent-id <id>", "OpenClaw Agent ID")
  .option("--channel <channel>", "Message delivery channel")
  .option("--no-deliver", "Do not deliver to messaging channel")
  .option("-d, --directory <dir>", "Working directory")
  .option("-w, --wait", "Wait for task completion (blocking mode)")
  .option("-t, --timeout <minutes>", "Timeout in minutes", "30")
  .action(async (prompt: string, options) => {
    try {
      const client = createClient({
        url: process.env.OPENCODE_URL,
        username: process.env.OPENCODE_USERNAME,
        password: process.env.OPENCODE_PASSWORD,
      });

      console.log("Dispatching task to OpenCode...");

      const { sessionId, taskId } = await dispatchTask(client, prompt, {
        directory: options.directory,
      });

      storeTask({
        taskId,
        sessionId,
        prompt,
        status: "running",
        createdAt: new Date(),
      });

      console.log(`Task dispatched: ${taskId}`);

      if (options.wait) {
        console.log("Waiting for completion...");
        const timeoutMs = parseInt(options.timeout) * 60 * 1000;
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
          const session = await client.sessions.get(sessionId);

          if (session.status === "completed" || session.status === "failed") {
            console.log(`\nTask ${session.status}: ${taskId}`);

            if (session.status === "completed") {
              console.log("\nResult:");
              console.log(session.result || "(no output)");
            } else {
              console.error("\nError:");
              console.error(session.error || "(unknown error)");
            }

            const openclawConfig = getOpenClawConfig();
            if (openclawConfig.callbackUrl || options.callbackUrl) {
              await sendCallback({
                message: formatCallbackMessage(
                  taskId,
                  session.result || "",
                  session.error
                ),
                name: "OpenCode Task",
                agentId: options.agentId,
                channel: options.channel,
                deliver: options.deliver,
              });
              console.log("Callback sent to OpenClaw");
            }

            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } else {
        console.log("Task is running asynchronously. Use 'status' command to check progress.");
      }
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
