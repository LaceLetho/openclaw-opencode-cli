import { Command } from "commander";
import { createClient, dispatchTask, registerCallback } from "../client.js";
import { storeTask, getActiveSession, setActiveSession, clearActiveSession } from "../utils/store.js";
import { logger } from "../utils/logger.js";

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
    const startTime = Date.now();

    try {
      logger.info("Task command started", {
        hasDirectory: !!options.directory,
        hasWorkspaceEnv: !!process.env.OPENCODE_WORKSPACE,
        wait: options.wait,
        newSession: options.newSession,
      });

      const client = createClient({
        url: process.env.OPENCODE_URL,
        username: process.env.OPENCODE_USERNAME,
        password: process.env.OPENCODE_PASSWORD,
      });

      // Determine working directory: CLI option > environment variable > undefined
      const workingDirectory = options.directory || process.env.OPENCODE_WORKSPACE;

      // Check for active session
      const activeSession = getActiveSession();
      let existingSessionId: string | undefined;

      if (!options.newSession && activeSession) {
        // Check if directory matches
        if (workingDirectory && activeSession.directory !== workingDirectory) {
          logger.info("Directory mismatch, creating new session", {
            currentDirectory: activeSession.directory,
            requestedDirectory: workingDirectory,
          });
          console.log(`Directory mismatch. Current session uses "${activeSession.directory}", but you specified "${workingDirectory}".`);
          console.log("Creating new session for this directory...");
        } else {
          existingSessionId = activeSession.sessionId;
          logger.session("reusing", existingSessionId, { directory: activeSession.directory });
          console.log(`Reusing existing session: ${existingSessionId}`);
        }
      }

      logger.info("Dispatching task to OpenCode", {
        promptLength: prompt.length,
        workingDirectory,
        hasExistingSession: !!existingSessionId,
      });
      console.log("Dispatching task to OpenCode...");

      const { sessionId, taskId, isNewSession } = await dispatchTask(client, prompt, {
        directory: workingDirectory,
        existingSessionId,
      });

      logger.session("created", sessionId, { isNewSession, taskId, workingDirectory });

      // Save session if it's new or we're explicitly creating a new one
      if (isNewSession || options.newSession) {
        setActiveSession(sessionId, workingDirectory);
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

      logger.task("dispatched", taskId, { sessionId, isNewSession });
      console.log(`Task dispatched: ${taskId}`);

      if (options.wait) {
        logger.info("Entering blocking wait mode", { timeout: options.timeout, taskId });
        console.log("Waiting for completion...");
        const timeoutMs = parseInt(options.timeout) * 60 * 1000;
        const waitStartTime = Date.now();
        let pollCount = 0;

        while (Date.now() - waitStartTime < timeoutMs) {
          pollCount++;

          // Get session info
          const sessionResult = await client.session.get({ path: { id: sessionId } });

          if (sessionResult.error) {
            logger.error("Failed to get session status", { taskId, sessionId, error: sessionResult.error });
            console.error("\nError checking session status:", sessionResult.error);
            break;
          }

          const session = sessionResult.data;
          if (!session) {
            logger.error("Session not found during wait", { taskId, sessionId });
            console.error("\nError: Session not found");
            break;
          }

          // Get session status
          const statusResult = await client.session.status({ query: { directory: session.directory } });
          const sessionStatus = statusResult.data?.[sessionId];

          // Session is idle if: 1) status type is "idle", or 2) session not in status list (OpenCode removes completed sessions)
          if (!sessionStatus || sessionStatus.type === "idle") {
            const duration = Date.now() - startTime;
            logger.task("completed", taskId, {
              sessionId,
              duration,
              pollCount,
              mode: "blocking"
            });
            console.log(`\nTask completed: ${taskId}`);
            console.log("Session is idle. Check the session for results.");
            break;
          }

          logger.debug("Polling session status", { taskId, pollCount, status: sessionStatus?.type || "idle (not in list)" });
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        if (Date.now() - waitStartTime >= timeoutMs) {
          logger.warn("Task wait timed out", { taskId, timeout: options.timeout });
        }
      } else {
        // Non-blocking mode: register callback with plugin
        const callbackUrl = options.callbackUrl || process.env.OPENCLAW_CALLBACK_URL;
        if (callbackUrl) {
          try {
            logger.callback("registering", sessionId, {
              callbackUrl,
              agentId: options.agentId || process.env.OPENCLAW_AGENT_ID || "main"
            });

            await registerCallback(sessionId, {
              url: callbackUrl,
              apiKey: process.env.OPENCLAW_API_KEY,
              agentId: options.agentId || process.env.OPENCLAW_AGENT_ID,
              channel: options.channel || process.env.OPENCLAW_CHANNEL,
              deliver: options.deliver ?? (process.env.OPENCLAW_DELIVER !== "false"),
            });

            logger.callback("registered", sessionId, { taskId, callbackUrl });
            console.log("Callback registered. You will be notified when the task completes.");
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error("Failed to register callback", {
              taskId,
              sessionId,
              error: errorMessage,
              callbackUrl
            });
            console.warn("Warning: Failed to register callback:", errorMessage);
            console.log("Task is running but you won't receive automatic notification.");
          }
        } else {
          logger.info("No callback URL configured, running async without notification", { taskId });
          console.log("Task is running asynchronously. Use 'status' command to check progress.");
        }
      }

      const totalDuration = Date.now() - startTime;
      logger.info("Task command completed", {
        taskId,
        duration: totalDuration,
        mode: options.wait ? "blocking" : "async"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Task command failed", { error: errorMessage, promptLength: prompt.length });
      console.error("Error:", errorMessage);
      process.exit(1);
    }
  });
