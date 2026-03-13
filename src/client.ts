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
