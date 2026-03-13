import { OpenCodeSDK } from "@opencode-ai/sdk";

export interface OpenCodeConfig {
  url?: string;
  username?: string;
  password?: string;
}

export function createClient(config: OpenCodeConfig): OpenCodeSDK {
  const url = config.url || process.env.OPENCODE_URL;
  const username = config.username || process.env.OPENCODE_USERNAME || "opencode";
  const password = config.password || process.env.OPENCODE_PASSWORD;

  if (!url) {
    throw new Error("OPENCODE_URL is required. Set it as environment variable or pass --url");
  }

  if (!password) {
    throw new Error("OPENCODE_PASSWORD is required. Set it as environment variable or pass --password");
  }

  return new OpenCodeSDK({
    baseUrl: url,
    auth: {
      type: "basic",
      username,
      password,
    },
  });
}

export async function dispatchTask(
  client: OpenCodeSDK,
  prompt: string,
  options?: { directory?: string }
): Promise<{ sessionId: string; taskId: string }> {
  const session = await client.sessions.create({
    prompt,
    ...(options?.directory && { cwd: options.directory }),
  });

  return {
    sessionId: session.id,
    taskId: session.id,
  };
}

export async function getSessionStatus(client: OpenCodeSDK, sessionId: string) {
  const session = await client.sessions.get(sessionId);
  return {
    id: session.id,
    status: session.status,
    result: session.result,
    error: session.error,
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
