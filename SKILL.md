---
name: opencode-bridge
description: Dispatch coding tasks to OpenCode AI agent and receive asynchronous callbacks when complete. Bridges OpenClaw with OpenCode for autonomous code execution, file operations, and project management.
license: MIT
compatibility: openclaw
metadata:
  category: automation
  integration: opencode
  type: external-tool
---

# OpenClaw ↔ OpenCode Bridge Skill

This skill enables OpenClaw to delegate coding tasks to OpenCode, a powerful AI coding agent that can autonomously read, write, and execute code. Tasks run asynchronously with automatic callbacks when complete.

## What I Do

- **Dispatch coding tasks** to OpenCode with natural language prompts
- **Execute code autonomously** - OpenCode handles file operations, terminal commands, and code changes
- **Maintain session continuity** - Multiple tasks reuse the same session for context awareness
- **Receive async callbacks** when tasks complete (non-blocking)
- **Support blocking mode** for immediate results when needed
- **Track task status** and manage multiple concurrent tasks

## When to Use Me

Use this skill when you need to:

- **Modify code** in a project (refactoring, bug fixes, feature implementation)
- **Analyze or review** existing code in a repository
- **Run terminal commands** or scripts in a project
- **Generate boilerplate** or scaffolding code
- **Perform complex multi-step** coding tasks that require file system access

**Do NOT use me** for simple queries that don't require code execution - use OpenClaw's built-in capabilities instead.

## Prerequisites

### 1. OpenCode Server

You need a running OpenCode server with the `@laceletho/plugin-openclaw` plugin installed.

**Configuration (`opencode.json`):**
```json
{
  "plugins": ["@laceletho/plugin-openclaw"],
  "openclaw": {
    "port": 9090,
    "openclawApiKey": "your-shared-secret-token"
  }
}
```

**Environment Variables:**
```bash
OPENCLAW_PORT=9090                    # Plugin HTTP server port
OPENCLAW_API_KEY=your-shared-secret   # Same as openclaw.openclawApiKey
```

### 2. OpenClaw Webhook Configuration

Configure OpenClaw to receive callbacks from the plugin (`openclaw.json`):

```json
{
  "hooks": {
    "enabled": true,
    "token": "your-shared-secret-token",
    "path": "/hooks",
    "allowedAgentIds": ["main", "hooks"],
    "defaultSessionKey": "hook:opencode",
    "allowedSessionKeyPrefixes": ["hook:"]
  }
}
```

**Important:** The `hooks.token` must match the `openclaw.openclawApiKey` from OpenCode configuration.

### 3. CLI Tool Installation

Install the CLI tool in your OpenClaw environment:

```bash
npm install -g @laceletho/openclaw-opencode-cli
```

### 4. Environment Configuration

Set these environment variables where OpenClaw runs:

```bash
# Required for remote OpenCode server
export OPENCODE_URL=https://your-opencode-server.com:4096
export OPENCODE_PASSWORD=your-opencode-password

# Optional: custom username (default: opencode)
export OPENCODE_USERNAME=opencode

# Callback configuration (sent to OpenCode plugin)
export OPENCLAW_CALLBACK_URL=http://localhost:18789/hooks/agent
export OPENCLAW_API_KEY=your-shared-secret-token
export OPENCLAW_AGENT_ID=main
export OPENCLAW_CHANNEL=last
export OPENCLAW_DELIVER=true
```

**Note:** The CLI automatically derives the Plugin URL from `OPENCODE_URL` by replacing the port with `9090`.
- If `OPENCODE_URL=https://server.com:4096`, plugin URL becomes `https://server.com:9090`
- For local development, it defaults to `http://localhost:9090`

## How It Works

```
┌─────────────┐      1. Dispatch Task        ┌─────────────┐
│   OpenClaw  │ ────────────────────────────▶│   OpenCode  │
│   (You)     │                              │   (AI Agent)│
│             │      2. Register Callback    │             │
│             │ ────────────────────────────▶│  Plugin     │
│             │         (port 9090)          │  (port 9090)│
└─────────────┘                              └──────┬──────┘
     ▲                                              │
     │                                              │ 3. Execute Task
     │                                              │    (autonomous)
     │                                              │
     │         4. Send Callback                     │
     │◄─────────────────────────────────────────────┘
     │            (when complete)
┌─────────────┐
│  Receive    │
│  Results    │
└─────────────┘
```

## Usage Examples

### Basic Task Dispatch (Non-blocking)

Dispatch a task and receive callback when complete:

```bash
openclaw-opencode task "Review the authentication code in src/auth/ and suggest improvements"
```

**Response:**
```
Task dispatched: task-abc123-def456
Callback registered. You will be notified when the task completes.
```

When the task completes, OpenClaw receives:
```
Task completed: task-abc123-def456

Result:
I've reviewed the authentication code. Here are my findings:

1. Missing input validation in login() function
2. Password hashing uses outdated algorithm
3. No rate limiting on login attempts

Suggested fixes have been applied to src/auth/login.ts
```

### Blocking Mode (Wait for Completion)

Wait for the task to complete and see results immediately:

```bash
openclaw-opencode task "Create a React component for a todo list" --wait
```

**Response:**
```
Task dispatched: task-xyz789-uvw012
Waiting for completion...

Task completed: task-xyz789-uvw012
Session is idle. Check the session for results.
```

### Specify Working Directory

Run the task in a specific directory:

```bash
openclaw-opencode task "Add error handling to all API routes" --directory ./backend
```

### Custom Callback Configuration

Override default callback settings for a specific task:

```bash
openclaw-opencode task "Generate unit tests" \
  --agent-id reviewer \
  --channel slack \
  --callback-url http://localhost:18789/hooks/reviewer
```

### Check Task Status

Check the status of a running task:

```bash
openclaw-opencode status task-abc123-def456
```

### List All Tasks

```bash
openclaw-opencode list
```

Clear completed tasks:

```bash
openclaw-opencode list --clear
```

### Session Management

**Reuse sessions for context continuity:**

```bash
# First task creates a new session
openclaw-opencode task "Create a new Express.js app"

# Subsequent tasks reuse the same session (OpenCode remembers previous work)
openclaw-opencode task "Add authentication middleware"
openclaw-opencode task "Create user routes with auth protection"

# Start fresh when switching to a different project
openclaw-opencode task "Create a Python Flask API" --new-session
```

**View and manage the active session:**

```bash
# Check current active session
openclaw-opencode session

# Clear the active session (next task will create a new one)
openclaw-opencode session --clear
```

**Response from `session`:**
```
Active session:
  Session ID: sess_abc123xyz
  Directory: /home/user/myproject
  Created at: 2024/01/15 10:30:45
```

## Command Reference

### `task` - Dispatch a Task

```bash
openclaw-opencode task <prompt> [options]
```

**Arguments:**
- `prompt` - Task description to send to OpenCode

**Options:**
- `-c, --callback-url <url>` - OpenClaw callback URL (default: env.OPENCLAW_CALLBACK_URL)
- `-a, --agent-id <id>` - OpenClaw Agent ID (default: env.OPENCLAW_AGENT_ID or "main")
- `--channel <channel>` - Message delivery channel (default: env.OPENCLAW_CHANNEL or "last")
- `--no-deliver` - Do not deliver to messaging channel
- `-d, --directory <dir>` - Working directory for the task
- `-w, --wait` - Wait for task completion in blocking mode
- `-t, --timeout <minutes>` - Timeout in minutes for blocking mode (default: 30)
- `-n, --new-session` - Create a new session (default: reuse existing session)

**Session Behavior:**
- By default, multiple `task` commands reuse the same OpenCode session
- This maintains context across related tasks
- Use `--new-session` when switching to unrelated work
- Changing `--directory` automatically creates a new session

### `session` - Manage Active Session

View or clear the active session used for task dispatch.

```bash
openclaw-opencode session [options]
```

**Options:**
- `-c, --clear` - Clear the active session

**Examples:**
```bash
# View current session
openclaw-opencode session

# Clear session (next task will create new session)
openclaw-opencode session --clear
```

### `status` - Check Task Status

```bash
openclaw-opencode status <taskId>
```

### `list` - List All Tasks

```bash
openclaw-opencode list [options]
```

**Options:**
- `--clear` - Clear completed tasks from the list

## Best Practices

### 1. Use Non-blocking for Long Tasks

For tasks that may take several minutes (large refactors, complex analysis), use the default non-blocking mode so OpenClaw remains responsive.

### 2. Provide Clear Prompts

Be specific in your prompts to get better results:

- **Good:** "Add input validation to the login function in src/auth/login.ts, checking for empty email and password length > 8"
- **Bad:** "Fix the login"

### 3. Set Appropriate Timeouts

For blocking mode, set realistic timeouts:

```bash
# Large refactoring job
openclaw-opencode task "Refactor the entire codebase to TypeScript" --wait --timeout 60
```

### 4. Use Different Agents for Different Workflows

Configure multiple agents for different types of tasks:

```bash
# Code review tasks
export OPENCLAW_AGENT_ID=reviewer
export OPENCLAW_CHANNEL=code-reviews
openclaw-opencode task "Review PR #123"

# DevOps tasks
export OPENCLAW_AGENT_ID=devops
export OPENCLAW_CHANNEL=infrastructure
openclaw-opencode task "Update deployment scripts"
```

### 5. Manage Sessions for Context

**Use session reuse for related tasks:**

```bash
# Building a feature - all in one session
openclaw-opencode task "Create a user model with email and password"
openclaw-opencode task "Add a login endpoint that uses the user model"
openclaw-opencode task "Write tests for the login endpoint"
```

**Use `--new-session` for unrelated work:**

```bash
# Working on a bug fix (unrelated to the feature above)
openclaw-opencode task "Fix the CSS layout on the homepage" --new-session
```

**Clear sessions when switching projects:**

```bash
# Done with project A, moving to project B
openclaw-opencode session --clear
openclaw-opencode task "Set up project B structure" --directory ./project-b
```

**Session Storage Location:**
- macOS/Linux: `~/.@laceletho-openclaw-opencode-cli/session.json`
- Windows: `%USERPROFILE%\.@laceletho-openclaw-opencode-cli\session.json`

## Troubleshooting

### "Failed to connect to opencode-plugin-openclaw"

**Cause:** Plugin is not running or not accessible

**Solutions:**
1. Ensure OpenCode server is running with the plugin loaded
2. Check that `OPENCODE_PLUGIN_URL` points to the correct address
3. For remote servers, ensure port 9090 is accessible

### "Callback failed: 401 Unauthorized"

**Cause:** Token mismatch between OpenCode and OpenClaw

**Solutions:**
1. Verify `openclaw.openclawApiKey` in `opencode.json` matches `hooks.token` in `openclaw.json`
2. Check that `OPENCLAW_API_KEY` environment variable is set correctly

### "OPENCODE_URL is required"

**Cause:** Environment variable not set

**Solutions:**
```bash
export OPENCODE_URL=https://your-opencode-server.com
export OPENCODE_PASSWORD=your-password
```

## Architecture Details

### Plugin Event Flow

The plugin subscribes to OpenCode events to track task progress:

1. **`message.part.updated`** - Accumulates text and tool outputs
2. **`message.part.delta`** - Handles streaming text
3. **`session.updated`** - Detects task completion (status = `completed` or `failed`)
4. **`session.error`** - Captures error information

### Security Considerations

- **Token Authentication:** All callbacks use Bearer token authentication
- **HTTP Basic Auth:** OpenCode API requires username/password
- **Agent ID Filtering:** OpenClaw can restrict which agents can receive callbacks via `allowedAgentIds`

## Related Documentation

- [OpenCode Documentation](https://opencode.ai)
- [OpenClaw Webhook Configuration](https://docs.openclaw.ai/automation/webhook)
- [Plugin Repository](https://github.com/LaceLetho/opencode-plugin-openclaw)
- [CLI Repository](https://github.com/LaceLetho/openclaw-opencode-cli)
