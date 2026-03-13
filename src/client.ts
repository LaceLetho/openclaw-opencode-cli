import { createOpencodeClient, OpencodeClient } from "@opencode-ai/sdk";

export interface OpenCodeConfig {
  url?: string;
  username?: string;
  password?: string;
}

export function createClient(config: OpenCodeConfig): OpencodeClient {
  const url = config.url || process.env.OPENCODE_URL;
  const username = config.username || process.env.OPENCODE_USERNAME || "opencode";
  const password = config.password || process.env.OPENCODE_PASSWORD;

  if (!url) {
    throw new Error("OPENCODE_URL is required. Set it as environment variable or pass --url");
  }

  if (!password) {
    throw new Error("OPENCODE_PASSWORD is required. Set it as environment variable or pass --password");
  }

  // Encode auth for Basic auth header
  const authString = `${username}:${password}`;
  const authHeader = `Basic ${Buffer.from(authString).toString("base64")}`;

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
  options?: { directory?: string }
): Promise<{ sessionId: string; taskId: string }> {
  // Create session first
  const createResult = await client.session.create({
    query: options?.directory ? { directory: options.directory } : undefined,
  });

  if (createResult.error) {
    throw new Error(`Failed to create session: ${createResult.error}`);
  }

  const session = createResult.data;
  if (!session) {
    throw new Error("Failed to create session: no data returned");
  }

  // Send prompt to the session
  const promptResult = await client.session.prompt({
    path: { id: session.id },
    body: {
      parts: [{ type: "text", text: prompt }],
    },
  });

  if (promptResult.error) {
    throw new Error(`Failed to send prompt: ${promptResult.error}`);
  }

  return {
    sessionId: session.id,
    taskId: session.id,
  };
}

export async function getSessionStatus(client: OpencodeClient, sessionId: string) {
  // Get session info
  const sessionResult = await client.session.get({ path: { id: sessionId } });

  if (sessionResult.error) {
    throw new Error(`Failed to get session: ${sessionResult.error}`);
  }

  const session = sessionResult.data;
  if (!session) {
    throw new Error("Failed to get session: no data returned");
  }

  // Get session status
  const statusResult = await client.session.status({ query: { directory: session.directory } });

  if (statusResult.error) {
    throw new Error(`Failed to get session status: ${statusResult.error}`);
  }

  const sessionStatus = statusResult.data?.[sessionId];

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
 * 向 OpenCode 插件注册回调配置
 * 插件会通过订阅 session.updated 事件来触发回调
 */
export async function registerCallback(
  sessionId: string,
  config: CallbackConfig
): Promise<void> {
  // 插件 HTTP 服务器默认运行在 9090 端口
  const pluginUrl = process.env.OPENCODE_PLUGIN_URL || "http://localhost:9090";

  try {
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

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to register callback: ${response.status} ${error}`);
    }

    console.log("Callback registered with plugin");
  } catch (error) {
    // 如果插件未运行，给出明确的错误提示
    if (error instanceof TypeError && error.message.includes("fetch failed")) {
      throw new Error(
        "Failed to connect to opencode-plugin-openclaw. " +
        "Please ensure the plugin is installed and enabled in opencode.json, " +
        "and OpenCode server is running with the plugin loaded."
      );
    }
    throw error;
  }
}
