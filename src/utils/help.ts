export function getHelpText(): string {
  return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    OpenClaw ↔ OpenCode CLI Bridge                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

This CLI tool allows OpenClaw to dispatch tasks to OpenCode and receive
asynchronous callbacks when tasks complete.

ARCHITECTURE OVERVIEW:
─────────────────────
┌─────────────┐     task dispatch      ┌─────────────┐
│   OpenClaw  │ ─────────────────────→ │   OpenCode  │
│  (You are   │                        │   (AI Agent)│
│   here)     │ ←───────────────────── │             │
└─────────────┘    callback on done    └─────────────┘

ENVIRONMENT VARIABLES:
─────────────────────
Required (for remote OpenCode server):
  OPENCODE_URL          OpenCode server URL (e.g., http://localhost:4096)
  OPENCODE_PASSWORD     HTTP Basic Auth password

Optional:
  OPENCODE_USERNAME     HTTP Basic Auth username (default: opencode)
  OPENCLAW_CALLBACK_URL OpenClaw hooks endpoint (default: http://localhost:18789/hooks/agent)
  OPENCLAW_API_KEY      OpenClaw hooks authentication token
  OPENCLAW_AGENT_ID     Target agent ID for callbacks (default: main)
  OPENCLAW_CHANNEL      Delivery channel (default: last)
  OPENCLAW_DELIVER      Whether to deliver to messaging channel (default: true)

CONNECTION MODES:
────────────────
1. REMOTE MODE (recommended for production)
   Set OPENCODE_URL and OPENCODE_PASSWORD to connect to a remote OpenCode server.
   
   Example:
   export OPENCODE_URL=https://opencode.example.com
   export OPENCODE_PASSWORD=secret

2. LOCAL MODE (development)
   If OPENCODE_URL is not set, the CLI will try to use a local OpenCode installation.
   OpenCode must be installed and available in PATH.

   Install OpenCode:
   curl -fsSL https://opencode.ai/install | bash

COMMANDS:
────────
`
}

export function getExamplesText(): string {
  return `
EXAMPLES:
────────

1. Dispatch a simple task (non-blocking):
   $ openclaw-opencode task "Write a Python function to calculate fibonacci"

2. Dispatch with custom callback URL:
   $ openclaw-opencode task "Review this code" \\
     --callback-url http://localhost:18789/hooks/agent

3. Dispatch and wait for completion (blocking):
   $ openclaw-opencode task "Create a React component" --wait

4. Dispatch with specific agent and channel:
   $ openclaw-opencode task "Analyze logs" \\
     --agent-id code-reviewer \\
     --channel telegram

5. Check task status:
   $ openclaw-opencode status task-1234567890-abc12

6. List all tasks:
   $ openclaw-opencode list

7. Clear completed tasks:
   $ openclaw-opencode list --clear

OPENCLAW INTEGRATION:
────────────────────

To receive callbacks in OpenClaw, ensure your OpenClaw configuration has
hooks enabled:

{
  "hooks": {
    "enabled": true,
    "token": "your-webhook-token",
    "path": "/hooks",
    "allowedAgentIds": ["main"]
  }
}

Then set the matching environment variable:
export OPENCLAW_API_KEY=your-webhook-token

For more information, visit:
https://github.com/laceletho/openclaw-opencode-cli
`
}
