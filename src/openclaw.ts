export interface OpenClawConfig {
  callbackUrl?: string;
  apiKey?: string;
  agentId?: string;
  channel?: string;
  deliver?: boolean;
}

export function getOpenClawConfig(): OpenClawConfig {
  return {
    callbackUrl: process.env.OPENCLAW_CALLBACK_URL,
    apiKey: process.env.OPENCLAW_API_KEY,
    agentId: process.env.OPENCLAW_AGENT_ID || "main",
    channel: process.env.OPENCLAW_CHANNEL || "last",
    deliver: process.env.OPENCLAW_DELIVER !== "false",
  };
}

export interface CallbackPayload {
  message: string;
  name?: string;
  agentId?: string;
  wakeMode?: "now" | "soon" | "later";
  deliver?: boolean;
  channel?: string;
}

export async function sendCallback(payload: CallbackPayload): Promise<void> {
  const config = getOpenClawConfig();
  const url = config.callbackUrl;

  if (!url) {
    throw new Error("OPENCLAW_CALLBACK_URL is required for callbacks");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
    },
    body: JSON.stringify({
      ...payload,
      agentId: payload.agentId || config.agentId,
      deliver: payload.deliver ?? config.deliver,
      channel: payload.channel || config.channel,
    }),
  });

  if (!response.ok) {
    throw new Error(`Callback failed: ${response.status} ${response.statusText}`);
  }
}

export function formatCallbackMessage(taskId: string, result: string, error?: string): string {
  if (error) {
    return `Task failed: ${taskId}\n\nError:\n${error}`;
  }
  return `Task completed: ${taskId}\n\nResult:\n${result}`;
}
