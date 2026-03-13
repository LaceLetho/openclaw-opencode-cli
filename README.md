# @laceletho/openclaw-opencode-cli

Command line tool for OpenClaw to dispatch tasks to OpenCode and receive asynchronous callbacks.

## Features

- 🔗 **Remote/Local Dual Mode**: Supports connecting to remote OpenCode servers or local installations
- ⚡ **Non-blocking Execution**: Tasks execute asynchronously with automatic callbacks to OpenClaw upon completion
- 🔄 **Session Persistence**: Multiple tasks reuse the same session for context continuity
- 📊 **Task Management**: View task status and history
- 🔒 **Secure Authentication**: Supports HTTP Basic Auth

## Installation

```bash
npm install -g @laceletho/openclaw-opencode-cli
```

## Quick Start

### 1. Configure Environment Variables (OpenClaw Side)

```bash
# Required for remote mode
export OPENCODE_URL=https://your-opencode-server.com
export OPENCODE_PASSWORD=your-password
export OPENCODE_USERNAME=opencode  # optional, default: opencode

# For callback integration with OpenClaw
export OPENCLAW_CALLBACK_URL=http://localhost:18789/hooks/agent
export OPENCLAW_API_KEY=your-openclaw-token
export OPENCLAW_AGENT_ID=main
```

### 2. Setup OpenCode Plugin (OpenCode Side)

For asynchronous callbacks to work, the OpenCode server needs the `@laceletho/plugin-openclaw` plugin installed and enabled.

**See the [plugin documentation](https://github.com/LaceLetho/opencode-plugin-openclaw) for setup instructions.**

### 3. Dispatch Tasks

**Session Management:**

By default, multiple `task` commands reuse the same OpenCode session:

```bash
# First task creates a new session
openclaw-opencode task "Create a new Express.js app"

# Subsequent tasks reuse the same session
openclaw-opencode task "Add authentication middleware"

# Create a new session when you want fresh context
openclaw-opencode task "Start a new Python project" --new-session
```

**Blocking vs Non-blocking:**

```bash
# Non-blocking mode (default) - Returns taskId, callbacks OpenClaw when done
openclaw-opencode task "Write a Python function to calculate fibonacci"

# Blocking mode - Waits in real-time, outputs result to terminal
openclaw-opencode task "Create a React component" --wait
```

## Command Reference

### `task` - Dispatch a Task

```bash
openclaw-opencode task <prompt> [options]
```

**Options:**
- `-c, --callback-url <url>` - OpenClaw callback URL
- `-a, --agent-id <id>` - OpenClaw Agent ID (default: main)
- `--channel <channel>` - Message delivery channel (default: last)
- `--no-deliver` - Do not deliver to messaging channel
- `-d, --directory <dir>` - Working directory
- `-w, --wait` - Wait for task completion in blocking mode
- `-t, --timeout <minutes>` - Timeout in minutes (default: 30)
- `-n, --new-session` - Create a new session

### `session` - Manage Active Session

```bash
# View current session
openclaw-opencode session

# Clear session (next task creates new session)
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

## Architecture

This CLI runs in the **OpenClaw environment** and communicates with OpenCode:

```
┌─────────────────┐      1. Create session      ┌─────────────────┐
│   openclaw-     │  ─────────────────────────→ │   OpenCode      │
│   opencode-cli  │                             │   HTTP API      │
│   (port 4096)   │      2. Send prompt         │   (port 4096)   │
│                 │  ─────────────────────────→ │                 │
│                 │                             │                 │
│                 │      3. Register callback   │   ┌───────────┐ │
│                 │  ─────────────────────────→ │   │ opencode- │ │
│                 │     POST /register          │   │ plugin-   │ │
│                 │                             │   │ openclaw  │ │
│                 │                             │   │ (port 9090)│ │
│                 │                             │   └───────────┘ │
└─────────────────┘                             └─────────────────┘
         ↑                                               │
         │                                               │
         └───────────────────────────────────────────────┘
              4. Plugin sends callback on completion
```

**Flow:**
1. CLI creates OpenCode session via HTTP API
2. CLI sends prompt to session
3. CLI registers callback with plugin (`POST /register`)
4. Plugin monitors session and sends callback to OpenClaw when done

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENCODE_URL` | Yes (remote) | - | OpenCode server URL |
| `OPENCODE_PASSWORD` | Yes (remote) | - | HTTP Basic Auth password |
| `OPENCODE_USERNAME` | No | `opencode` | HTTP Basic Auth username |
| `OPENCLAW_CALLBACK_URL` | No | - | OpenClaw callback URL |
| `OPENCLAW_API_KEY` | No | - | OpenClaw authentication token |
| `OPENCLAW_AGENT_ID` | No | `main` | Target Agent ID |
| `LOG_LEVEL` | No | `info` | Log verbosity: `debug`, `info`, `warn`, `error` |

## Session Persistence

Sessions are persisted locally:

- **macOS/Linux**: `~/.@laceletho-openclaw-opencode-cli/session.json`
- **Windows**: `%USERPROFILE%\.@laceletho-openclaw-opencode-cli\session.json`

First `task` creates a session and saves it. Subsequent tasks reuse the saved session. Use `--new-session` to create a new one.

## Logging

The CLI outputs structured logs to stdout/stderr for debugging and monitoring:

### Log Levels

Set `LOG_LEVEL` environment variable to control verbosity:

```bash
# Debug mode - detailed logs for troubleshooting
export LOG_LEVEL=debug
openclaw-opencode task "Create a React app"

# Info mode (default) - key events only
export LOG_LEVEL=info
openclaw-opencode task "Create a React app"

# Error mode - errors only
export LOG_LEVEL=error
```

### Log Format

```
2025-03-13T10:30:45.123Z [openclaw-opencode] [INFO] Task dispatched {"taskId":"sess_abc123","isNewSession":true}
2025-03-13T10:30:45.234Z [openclaw-opencode] [INFO] Session created {"sessionId":"sess_abc123","duration":89}
2025-03-13T10:30:45.456Z [openclaw-opencode] [INFO] Callback registered {"sessionId":"sess_abc123","callbackUrl":"http://localhost:18789/hooks/agent"}
```

### Railway Dashboard

Logs are automatically captured by Railway. View them in your project's **Observability** tab.

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
