# OpenClaw ↔ OpenCode CLI Bridge

A command line tool that allows OpenClaw to dispatch tasks to OpenCode and receive asynchronous callbacks.

## Features

- 🔗 **Remote/Local Dual Mode**: Supports connecting to remote OpenCode servers or local installations
- ⚡ **Non-blocking Execution**: Tasks execute asynchronously with automatic callbacks to OpenClaw upon completion
- 🔄 **Session Persistence**: Multiple tasks reuse the same session for context continuity
- 📊 **Task Management**: View task status and history
- 🔒 **Secure Authentication**: Supports HTTP Basic Auth and Bearer Token
- 📝 **Rich Help**: Detailed help information and examples

## Installation for OpenClaw

```bash
npm install -g @laceletho/openclaw-opencode-cli
```

## Quick Start

### 1. Configure Environment Variables

**Remote Mode**:

#### In OpenClaw Environment (where CLI runs)
```bash
# Connect to OpenCode server (remote mode)
export OPENCODE_URL=https://your-opencode-server.com
export OPENCODE_PASSWORD=your-password
```

#### In OpenCode Environment (where OpenCode server runs)

**Prerequisite**: You need to install and enable the [`@laceletho/plugin-openclaw`](https://www.npmjs.com/package/@laceletho/plugin-openclaw) plugin on the OpenCode server for callbacks to work properly.

```bash
# Install the plugin
npm install @laceletho/plugin-openclaw

# Enable the plugin in opencode.json
{
  "plugins": ["@laceletho/plugin-openclaw"],
  "openclaw": {
    "port": 9090,
    "openclawApiKey": "your-openclaw-token"
  }
}
```

The plugin listens on port 9090 by default to receive callback registration requests.

**Local Mode**:
```bash
# Just install OpenCode
curl -fsSL https://opencode.ai/install | bash
```

### 2. Dispatch Tasks

**Session Management:**

By default, multiple `task` commands reuse the same OpenCode session, maintaining context across tasks:

```bash
# First task creates a new session
openclaw-opencode task "Create a new Express.js app"

# Subsequent tasks reuse the same session (with context from previous tasks)
openclaw-opencode task "Add authentication middleware"
openclaw-opencode task "Create user routes"

# Create a new session when you want a fresh context
openclaw-opencode task "Start a new Python project" --new-session
```

**Blocking vs Non-blocking:**

```bash
# Non-blocking mode (default) - Returns taskId, executes in background, callbacks OpenClaw when done
openclaw-opencode task "Write a Python function to calculate fibonacci"

# Blocking mode (wait for completion) - Waits in real-time, outputs result to terminal, no callback sent
openclaw-opencode task "Create a React component" --wait
```

### 3. Manage Sessions

```bash
# View current active session
openclaw-opencode session

# Clear active session (next task will create a new one)
openclaw-opencode session --clear
```

### 4. Check Task Status

```bash
# Check specific task
openclaw-opencode status task-1234567890-abc12

# List all tasks
openclaw-opencode list
```

## Command Reference

### `task` - Dispatch a Task

```bash
openclaw-opencode task <prompt> [options]
```

**Arguments:**
- `prompt` - Task description to send to OpenCode

**Options:**
- `-c, --callback-url <url>` - OpenClaw callback URL
- `-a, --agent-id <id>` - OpenClaw Agent ID (default: main)
- `--channel <channel>` - Message delivery channel (default: last)
- `--no-deliver` - Do not deliver to messaging channel
- `-d, --directory <dir>` - Working directory
- `-w, --wait` - Wait for task completion in blocking mode
- `-t, --timeout <minutes>` - Timeout in minutes (default: 30)
- `-n, --new-session` - Create a new session and use it for future tasks

**Examples:**
```bash
# Reuse existing session (default)
openclaw-opencode task "Write tests for this file" --wait

# Create a new session
openclaw-opencode task "Review code" --new-session --agent-id reviewer --channel slack

# Chain related tasks in the same session
openclaw-opencode task "Create a user model"
openclaw-opencode task "Add authentication using that model"
```

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
openclaw-opencode list
openclaw-opencode list --clear  # Clear completed tasks
```

## Environment Variables

| Variable | Setup Location | Required | Default | Description |
|----------|---------------|----------|---------|-------------|
| `OPENCODE_URL` | **OpenClaw Environment** | Remote mode | - | OpenCode server URL (plugin URL auto-derived from this) |
| `OPENCODE_PASSWORD` | **OpenClaw Environment** | Remote mode | - | HTTP Basic Auth password |
| `OPENCODE_USERNAME` | **OpenClaw Environment** | No | opencode | HTTP Basic Auth username |
| `OPENCLAW_CALLBACK_URL` | **OpenCode Environment** | No | http://localhost:18789/hooks/agent | OpenClaw callback address |
| `OPENCLAW_API_KEY` | **OpenCode Environment** | No | - | OpenClaw authentication token |
| `OPENCLAW_AGENT_ID` | **OpenClaw Environment** | No | main | Target Agent ID |
| `OPENCLAW_CHANNEL` | **OpenClaw Environment** | No | last | Delivery channel |
| `OPENCLAW_DELIVER` | **OpenClaw Environment** | No | true | Whether to deliver to messaging channel |

**Plugin URL Auto-Derivation:**
The CLI automatically derives the plugin URL from `OPENCODE_URL` by replacing the port with `9090`:
- `OPENCODE_URL=https://server.com:4096` → Plugin URL: `https://server.com:9090`
- For local development, defaults to `http://localhost:9090`

**Note**: `OPENCLAW_*` callback-related variables only take effect in **non-blocking mode** (default). In blocking mode (`--wait`), task results are output directly to the terminal without sending callbacks.

**How It Works**:
1. After the CLI creates a session, in non-blocking mode it registers callback info with the plugin's `/register` endpoint
2. The plugin subscribes to OpenCode's `session.updated` event
3. When the session completes (`completed` or `failed`), the plugin automatically sends a callback to OpenClaw

## OpenClaw Integration

### 1. Configure OpenClaw Hooks

Enable hooks in `~/.openclaw/openclaw.json`:

```json
{
  "hooks": {
    "enabled": true,
    "token": "your-secure-token",
    "path": "/hooks",
    "allowedAgentIds": ["main", "hooks"]
  }
}
```

### 2. Configure Plugin in OpenCode Environment

Make sure the `@laceletho/plugin-openclaw` plugin is installed and enabled on the OpenCode server:

```bash
# Install the plugin
npm install @laceletho/plugin-openclaw

# Enable in opencode.json
{
  "plugins": ["@laceletho/plugin-openclaw"],
  "openclaw": {
    "port": 9090
  }
}
```

The plugin will automatically:
1. Start an HTTP server (default port 9090) to receive callback registrations
2. Subscribe to OpenCode's `session.updated` event
3. Send callbacks to OpenClaw when sessions complete

### 3. Task Completion Callback

In non-blocking mode, the CLI registers a callback with the plugin. When the OpenCode session completes, the plugin automatically triggers the callback:

```json
{
  "message": "Task completed: task-xxx\n\nResult:\nHere's the code...",
  "name": "OpenCode Task",
  "agentId": "main",
  "wakeMode": "now",
  "deliver": true,
  "channel": "last"
}
```

## Architecture

```
┌─────────────┐      task dispatch      ┌─────────────┐
│   OpenClaw  │ ─────────────────────→ │   OpenCode  │
│  (External) │                        │   (AI Agent)│
└─────────────┘                        └──────┬──────┘
                                              │
                           ┌───────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Callback   │
                    │  to OpenClaw │
                    └──────────────┘
```

## Session Persistence

Sessions are persisted locally to maintain context across multiple `task` commands:

**Storage Location:**
- macOS/Linux: `~/.@laceletho-openclaw-opencode-cli/session.json`
- Windows: `%USERPROFILE%\.@laceletho-openclaw-opencode-cli\session.json`

**Behavior:**
- First `task` command creates a new session and saves it
- Subsequent `task` commands reuse the saved session
- Use `--new-session` to create a new session (and replace the saved one)
- Use `session --clear` to clear the saved session
- Directory changes trigger a new session (to avoid context confusion)

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Type check
npm run typecheck
```

## License

MIT
