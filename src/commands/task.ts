import { Command } from "commander";
import { createClient, dispatchTask, registerCallback } from "../client.js";
import { storeTask, getActiveSession, setActiveSession, clearActiveSession } from "../utils/store.js";

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
  .option("-n, --new-session", "Create a new session and use it for future tasks")
  .action(async (prompt: string, options) => {
    try {
      const client = createClient({
        url: process.env.OPENCODE_URL,
        username: process.env.OPENCODE_USERNAME,
        password: process.env.OPENCODE_PASSWORD,
      });

      // Check for active session
      const activeSession = getActiveSession();
      let existingSessionId: string | undefined;

      if (!options.newSession && activeSession) {
        // Check if directory matches
        if (options.directory && activeSession.directory !== options.directory) {
          console.log(`Directory mismatch. Current session uses "${activeSession.directory}", but you specified "${options.directory}".`);
          console.log("Creating new session for this directory...");
        } else {
          existingSessionId = activeSession.sessionId;
          console.log(`Reusing existing session: ${existingSessionId}`);
        }
      }

      console.log("Dispatching task to OpenCode...");

      const { sessionId, taskId, isNewSession } = await dispatchTask(client, prompt, {
        directory: options.directory,
        existingSessionId,
      });

      // Save session if it's new or we're explicitly creating a new one
      if (isNewSession || options.newSession) {
        setActiveSession(sessionId, options.directory);
        if (options.newSession) {
          console.log(`Created new session: ${sessionId}`);
        }
      }

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
          // Get session info
          const sessionResult = await client.session.get({ path: { id: sessionId } });

          if (sessionResult.error) {
            console.error("\nError checking session status:", sessionResult.error);
            break;
          }

          const session = sessionResult.data;
          if (!session) {
            console.error("\nError: Session not found");
            break;
          }

          // Get session status
          const statusResult = await client.session.status({ query: { directory: session.directory } });
          const sessionStatus = statusResult.data?.[sessionId];

          if (sessionStatus?.type === "idle") {
            console.log(`\nTask completed: ${taskId}`);
            console.log("Session is idle. Check the session for results.");
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } else {
        // Non-blocking mode: register callback with plugin
        const callbackUrl = options.callbackUrl || process.env.OPENCLAW_CALLBACK_URL;
        if (callbackUrl) {
          try {
            await registerCallback(sessionId, {
              url: callbackUrl,
              apiKey: process.env.OPENCLAW_API_KEY,
              agentId: options.agentId || process.env.OPENCLAW_AGENT_ID,
              channel: options.channel || process.env.OPENCLAW_CHANNEL,
              deliver: options.deliver ?? (process.env.OPENCLAW_DELIVER !== "false"),
            });
            console.log("Callback registered. You will be notified when the task completes.");
          } catch (err) {
            console.warn("Warning: Failed to register callback:", err instanceof Error ? err.message : err);
            console.log("Task is running but you won't receive automatic notification.");
          }
        } else {
          console.log("Task is running asynchronously. Use 'status' command to check progress.");
        }
      }
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
