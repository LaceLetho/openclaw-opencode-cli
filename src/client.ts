import { createOpencodeClient, OpencodeClient } from "@opencode-ai/sdk/v2";
import { logger } from "./utils/logger.js";

export interface OpenCodeConfig {
  url?: string;
  username?: string;
  password?: string;
}

export function createClient(config: OpenCodeConfig): OpencodeClient {
  const url = config.url || process.env.OPENCODE_URL;
  const username = config.username || process.env.OPENCODE_USERNAME || "opencode";
  const password = config.password || process.env.OPENCODE_PASSWORD;

  logger.debug("Creating OpenCode client", {
    hasUrl: !!url,
    hasPassword: !!password,
    username,
  });

  if (!url) {
    logger.error("OPENCODE_URL not configured");
    throw new Error("OPENCODE_URL is required. Set it as environment variable or pass --url");
  }

  if (!password) {
    logger.error("OPENCODE_PASSWORD not configured");
    throw new Error("OPENCODE_PASSWORD is required. Set it as environment variable or pass --password");
  }

  // Encode auth for Basic auth header
  const authString = `${username}:${password}`;
  const authHeader = `Basic ${Buffer.from(authString).toString("base64")}`;

  logger.info("OpenCode client initialized", { baseUrl: url });

  return createOpencodeClient({
    baseUrl: url,
    headers: {
      Authorization: authHeader,
    },
  });
}

export async function dispatchTask(
  client: OpencodeClient,
  prompt: string,
  options?: { directory?: string; existingSessionId?: string }
): Promise<{ sessionId: string; taskId: string; isNewSession: boolean }> {
  let sessionId: string;
  let isNewSession = false;
  const startTime = Date.now();

  if (options?.existingSessionId) {
    // Reuse existing session
    sessionId = options.existingSessionId;
    logger.session("reusing", sessionId, { directory: options?.directory });
  } else {
    // Create new session
    logger.info("Creating new session", { directory: options?.directory });

    const createStart = Date.now();
    const createResult = await client.session.create(
      options?.directory ? { directory: options.directory } : undefined
    );

    logger.http("POST", "/session", createResult.error ? 500 : 200, Date.now() - createStart);

    if (createResult.error) {
      logger.error("Failed to create session", { error: createResult.error });
      throw new Error(`Failed to create session: ${createResult.error}`);
    }

    const session = createResult.data;
    if (!session) {
      logger.error("Session creation returned no data");
      throw new Error("Failed to create session: no data returned");
    }

    sessionId = session.id;
    isNewSession = true;
    logger.session("created", sessionId, { directory: session.directory, duration: Date.now() - createStart });
  }

  // Send prompt to the session
  logger.info("Sending prompt to session", { sessionId, promptLength: prompt.length });
  const promptStart = Date.now();

  const promptResult = await client.session.prompt({
    sessionID: sessionId,
    parts: [{ type: "text", text: prompt }],
  });

  logger.http("POST", `/session/${sessionId}/prompt`, promptResult.error ? 500 : 200, Date.now() - promptStart);

  if (promptResult.error) {
    logger.error("Failed to send prompt", { sessionId, error: promptResult.error });
    throw new Error(`Failed to send prompt: ${promptResult.error}`);
  }

  logger.info("Task dispatched successfully", {
    sessionId,
    isNewSession,
    duration: Date.now() - startTime,
  });

  return {
    sessionId: sessionId,
    taskId: sessionId,
    isNewSession: isNewSession,
  };
}

export async function getSessionStatus(client: OpencodeClient, sessionId: string) {
  logger.debug("Getting session status", { sessionId });

  // Get session info
  const sessionStart = Date.now();
  const sessionResult = await client.session.get({ sessionID: sessionId });
  logger.http("GET", `/session/${sessionId}`, sessionResult.error ? 500 : 200, Date.now() - sessionStart);

  if (sessionResult.error) {
    logger.error("Failed to get session", { sessionId, error: sessionResult.error });
    throw new Error(`Failed to get session: ${sessionResult.error}`);
  }

  const session = sessionResult.data;
  if (!session) {
    logger.error("Session not found", { sessionId });
    throw new Error("Failed to get session: no data returned");
  }

  // Get session status
  const statusStart = Date.now();
  const statusResult = await client.session.status({ directory: session.directory });
  logger.http("GET", `/session/status`, statusResult.error ? 500 : 200, Date.now() - statusStart);

  if (statusResult.error) {
    logger.error("Failed to get session status", { sessionId, error: statusResult.error });
    throw new Error(`Failed to get session status: ${statusResult.error}`);
  }

  const sessionStatus = statusResult.data?.[sessionId];

  logger.debug("Session status retrieved", {
    sessionId,
    status: sessionStatus?.type || "unknown",
  });

  return {
    id: session.id,
    title: session.title,
    directory: session.directory,
    status: sessionStatus || { type: "unknown" },
    created: session.time.created,
    updated: session.time.updated,
  };
}

export interface CallbackConfig {
  url: string;
  apiKey?: string;
  agentId?: string;
  channel?: string;
  deliver?: boolean;
}

/**
 * Derive plugin URL from OPENCODE_URL
 * Example: https://server.com:4096 -> https://server.com:9090
 */
function getPluginUrl(): string {
  // Use explicit plugin URL if set
  if (process.env.OPENCODE_PLUGIN_URL) {
    logger.debug("Using explicit plugin URL", { url: process.env.OPENCODE_PLUGIN_URL });
    return process.env.OPENCODE_PLUGIN_URL;
  }

  // Derive from OPENCODE_URL
  const opencodeUrl = process.env.OPENCODE_URL;
  if (!opencodeUrl) {
    logger.debug("No OPENCODE_URL set, using default plugin URL");
    return "http://localhost:9090";
  }

  try {
    const url = new URL(opencodeUrl);
    // Replace port with 9090 (default plugin port)
    url.port = "9090";
    const pluginUrl = url.toString().replace(/\/$/, ""); // Remove trailing slash
    logger.debug("Derived plugin URL", { opencodeUrl, pluginUrl });
    return pluginUrl;
  } catch {
    logger.warn("Failed to parse OPENCODE_URL, using default plugin URL", { opencodeUrl });
    // Fallback to localhost if URL parsing fails
    return "http://localhost:9090";
  }
}

/**
 * Register callback configuration with the OpenCode plugin
 * The plugin triggers callbacks by subscribing to session.updated events
 */
export async function registerCallback(
  sessionId: string,
  config: CallbackConfig
): Promise<void> {
  const pluginUrl = getPluginUrl();
  logger.info("Registering callback with plugin", {
    sessionId,
    pluginUrl,
    callbackUrl: config.url,
    agentId: config.agentId || "main",
  });

  try {
    const startTime = Date.now();
    const response = await fetch(`${pluginUrl}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        callbackConfig: config,
      }),
    });

    logger.http("POST", "/register", response.status, Date.now() - startTime);

    if (!response.ok) {
      const error = await response.text();
      logger.error("Callback registration failed", {
        sessionId,
        status: response.status,
        error,
      });
      throw new Error(`Failed to register callback: ${response.status} ${error}`);
    }

    logger.callback("registered", sessionId, { callbackUrl: config.url });
    console.log("Callback registered with plugin");
  } catch (error) {
    // Provide clear error message if plugin is not running
    if (error instanceof TypeError && error.message.includes("fetch failed")) {
      logger.error("Failed to connect to plugin", {
        sessionId,
        pluginUrl,
        error: error.message,
      });
      throw new Error(
        "Failed to connect to opencode-plugin-openclaw. " +
        "Please ensure the plugin is installed and enabled in opencode.json, " +
        "and OpenCode server is running with the plugin loaded."
      );
    }
    throw error;
  }
}
