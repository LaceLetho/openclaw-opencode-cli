import { Command } from "commander";
import { createClient, registerCallback } from "../client.js";
import { storeTask, getActiveSession, setActiveSession, clearActiveSession } from "../utils/store.js";
import { logger } from "../utils/logger.js";

export const taskCommand = new Command("task")
  .description("Dispatch a task to OpenCode")
  .argument("<prompt>", "Task prompt to send to OpenCode")
  .option("-c, --callback-url <url>", "OpenClaw callback URL for receiving task completion callbacks")
  .option("-a, --agent-id <id>", "Target agent ID for callback routing (required for async mode)")
  .option("--channel <channel>", "Message delivery channel for callback, e.g., telegram, slack (required for async mode)")
  .option("--to <recipient>", "Target recipient for callback message, e.g., @username, #channel (required for async mode)")
  .option("-d, --directory <dir>", "Working directory")
  .option("-w, --wait", "Wait for task completion (blocking mode). When used, callback options are not required")
  .option("-t, --timeout <minutes>", "Timeout in minutes", "30")
  .option("-n, --new-session", "Create a new session and use it for future tasks")
  .action(async (prompt: string, options) => {
    const startTime = Date.now();

    // Validate callback options for async mode
    if (!options.wait) {
      const missingOptions: string[] = [];
      if (!options.agentId) missingOptions.push("--agent-id");
      if (!options.channel) missingOptions.push("--channel");
      if (!options.to) missingOptions.push("--to");

      if (missingOptions.length > 0) {
        console.error(`Error: Callback options are required for async mode (when not using --wait). Missing: ${missingOptions.join(", ")}`);
        console.error("These options configure where task completion callbacks are sent:");
        console.error("  --agent-id: Target agent ID for callback routing");
        console.error("  --channel:  Message delivery channel (e.g., telegram, slack)");
        console.error("  --to:       Target recipient (e.g., @username, #channel)");
        console.error("\nOr use --wait for blocking mode (no callback needed).");
        process.exit(1);
      }
    }

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

      // First, create or get the session
      let sessionId: string;
      let isNewSession = false;

      if (existingSessionId) {
        sessionId = existingSessionId;
        logger.session("reusing", sessionId, { directory: workingDirectory });
      } else {
        logger.warn("[DIRECTORY_DEBUG] Creating new session", {
          workingDirectory,
          optionsDirectory: options.directory,
          envWorkspace: process.env.OPENCODE_WORKSPACE,
          hasWorkingDirectory: !!workingDirectory,
        });
        console.log(`[DIRECTORY_DEBUG] Creating session with directory: ${workingDirectory || "undefined"}`);

        const createParams = workingDirectory ? { directory: workingDirectory } : undefined;
        logger.warn("[DIRECTORY_DEBUG] SDK create params", { createParams });

        const createResult = await client.session.create(createParams);

        logger.warn("[DIRECTORY_DEBUG] SDK create result", {
          error: createResult.error,
          hasData: !!createResult.data,
          sessionId: createResult.data?.id,
          sessionDirectory: createResult.data?.directory,
        });

        if (createResult.error) {
          logger.error("Failed to create session", { error: createResult.error });
          throw new Error(`Failed to create session: ${createResult.error}`);
        }

        const session = createResult.data;
        if (!session) {
          throw new Error("Failed to create session: no data returned");
        }

        sessionId = session.id;
        isNewSession = true;
        logger.warn("[DIRECTORY_DEBUG] Session created", {
          sessionId,
          requestedDirectory: workingDirectory,
          actualDirectory: session.directory,
          directoryMatch: workingDirectory === session.directory,
        });
        logger.session("created", sessionId, { directory: session.directory });
      }

      const taskId = sessionId;

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

      // Debug: Log all environment variables related to openclaw
      logger.info("Environment check", {
        OPENCLAW_CALLBACK_URL: process.env.OPENCLAW_CALLBACK_URL,
        OPENCLAW_API_KEY: process.env.OPENCLAW_API_KEY ? "SET" : "NOT_SET",
        OPENCLAW_CHANNEL: process.env.OPENCLAW_CHANNEL,
        OPENCLAW_TO: process.env.OPENCLAW_TO,
        OPENCODE_URL: process.env.OPENCODE_URL,
        NODE_ENV: process.env.NODE_ENV,
      });

      // Register callback BEFORE sending prompt to avoid race condition
      const callbackUrl = options.callbackUrl || process.env.OPENCLAW_CALLBACK_URL;
      let callbackRegistered = false;
      logger.info("Callback URL resolution", { callbackUrl, fromOptions: !!options.callbackUrl, fromEnv: !!process.env.OPENCLAW_CALLBACK_URL });
      if (!options.wait && callbackUrl) {
        try {
          logger.callback("registering", sessionId, {
            callbackUrl,
            agentId: options.agentId,
            channel: options.channel,
            to: options.to,
          });

          const callbackConfig = {
            url: callbackUrl,
            apiKey: process.env.OPENCLAW_API_KEY,
            agentId: options.agentId,
            channel: options.channel,
            deliver: true,
            to: options.to,
          };
          logger.info("Callback config prepared", {
            url: callbackConfig.url,
            hasApiKey: !!callbackConfig.apiKey,
            agentId: callbackConfig.agentId,
            channel: callbackConfig.channel,
            to: callbackConfig.to,
          });
          await registerCallback(sessionId, callbackConfig);

          logger.callback("registered", sessionId, { taskId, callbackUrl });
          console.log("Callback registered. You will be notified when the task completes.");
          callbackRegistered = true;
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
      }

      // Now send the prompt
      logger.info("Sending prompt to session", { sessionId, promptLength: prompt.length });
      const promptResult = await client.session.prompt({
        sessionID: sessionId,
        parts: [{ type: "text", text: prompt }],
      });

      if (promptResult.error) {
        logger.error("Failed to send prompt", { sessionId, error: promptResult.error });
        throw new Error(`Failed to send prompt: ${promptResult.error}`);
      }

      logger.info("Task dispatched successfully", { sessionId, isNewSession });
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
          const sessionResult = await client.session.get({ sessionID: sessionId });

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
          const statusResult = await client.session.status({ directory: session.directory });
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

            // Fetch and display the last assistant message
            try {
                const messagesResult = await client.session.messages({
                sessionID: sessionId,
                limit: 5,
              });

              if (messagesResult.data && messagesResult.data.length > 0) {
                // Find the last assistant message
                const messages = messagesResult.data;
                for (let i = messages.length - 1; i >= 0; i--) {
                  const msg = messages[i];
                  if (msg.info.role === "assistant" && msg.parts && msg.parts.length > 0) {
                    const textParts = msg.parts.filter((p: any) => p.type === "text");
                    if (textParts.length > 0) {
                      const reply = textParts.map((p: any) => p.text).join("\n");
                      console.log("\n--- AI Response ---");
                      console.log(reply);
                      console.log("-------------------\n");
                      break;
                    }
                  }
                }
              }
            } catch (err) {
              logger.debug("Failed to fetch messages", { sessionId, error: err });
            }

            break;
          }

          logger.debug("Polling session status", { taskId, pollCount, status: sessionStatus?.type || "idle (not in list)" });
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        if (Date.now() - waitStartTime >= timeoutMs) {
          logger.warn("Task wait timed out", { taskId, timeout: options.timeout });
        }
      } else {
        // Non-blocking mode: callback already registered before sending prompt
        if (callbackRegistered) {
          console.log("Task is running asynchronously. You will be notified when it completes.");
        } else if (callbackUrl) {
          console.log("Task is running asynchronously. Callback registration failed - use 'status' command to check progress.");
        } else {
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
