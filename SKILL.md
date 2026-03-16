---
name: openclaw-opencode-cli
description: Dispatch coding tasks to OpenCode AI agent via CLI. Supports async callbacks, session management, and both blocking/non-blocking execution modes for autonomous code operations.
license: MIT
compatibility: openclaw
metadata:
  category: automation
  integration: opencode
  type: external-tool
  cli: openclaw-opencode
---

# OpenClaw ↔ OpenCode CLI Bridge

Delegate coding tasks to OpenCode AI agent and receive asynchronous callbacks when complete. This CLI tool bridges OpenClaw with OpenCode for autonomous code execution, file operations, and project management.

## Overview

- **Non-blocking by default** - Dispatch tasks and continue; get notified when done
- **Session continuity** - Related tasks share context automatically
- **Blocking mode available** - Use `--wait` for immediate results
- **Remote or local** - Works with local OpenCode or cloud deployments

## Prerequisites

### 1. Install CLI

```bash
npm install -g @laceletho/openclaw-opencode-cli
```

## Quick Start

```bash
# Dispatch a task (non-blocking) - requires callback options: --agent-id, --channel, --to
openclaw-opencode task "Review authentication code in src/auth/" \
  --agent-id agentToHandleCallback \
  --channel callbackChannel \
  --to chatIDToForwardResults

# Wait for completion
openclaw-opencode task "Create React todo component" --wait

# Check status
openclaw-opencode status task-abc123-def456

# List all tasks
openclaw-opencode list
```

## Commands

### `task` - Dispatch Task to OpenCode

```bash
openclaw-opencode task <prompt> [options]
```

**Arguments:**
- `prompt` - Natural language task description

**Options:**
| Option | Description | Default | Required |
|--------|-------------|---------|----------|
| `-w, --wait` | Block until completion (no callback needed) | false | No |
| `-t, --timeout <min>` | Timeout for blocking mode | 30 min | No |
| `-d, --directory <dir>` | Working directory (or `OPENCODE_WORKSPACE` env var) | current dir | No |
| `-n, --new-session` | Create new session | reuse existing | No |
| `-c, --callback-url <url>` | Override callback URL | env.OPENCLAW_CALLBACK_URL | No |
| `-a, --agent-id <id>` | Target agent ID for callback routing | - | **Async mode only** |
| `--channel <ch>` | Delivery channel for callback (e.g., telegram, slack) | - | **Async mode only** |
| `--to <recipient>` | Target recipient for callback (e.g., @username, #channel) | - | **Async mode only** |

**Callback Options (`--agent-id`, `--channel`, `--to`):**

These options configure where task completion callbacks are sent. They are **only required for async mode** (default non-blocking behavior). When using `--wait` (blocking mode), these options are not needed.

- `--agent-id`: The agent ID that will receive the callback
- `--channel`: The messaging platform/channel type (e.g., telegram, slack, email)
- `--to`: The specific recipient identifier (e.g., @username, #channel-name, user@example.com)

**Examples:**

```bash

# Specific directory with timeout
openclaw-opencode task "Add tests" --directory ./backend --wait --timeout 60

# New session for unrelated work (async mode)
openclaw-opencode task "Create new landing page" --new-session \
  --agent-id myagent \
  --channel telegram \
  --to @username
  
```

**Session Behavior:**
- Tasks reuse the same session by default (maintains context)
- Use `--new-session` when switching unrelated work
- Changing `--directory` automatically creates a new session
- Session stored at `~/.@laceletho-openclaw-opencode-cli/session.json`

### `session` - Manage Active Session

```bash
# View current session
openclaw-opencode session

# Clear session (next task creates new one)
openclaw-opencode session --clear
```

### `status` - Check Task Status

```bash
openclaw-opencode status <task-id>
```

### `list` - List All Tasks

```bash
# Show all tasks
openclaw-opencode list

# Clear completed tasks
openclaw-opencode list --clear
```

## Usage Patterns

### Pattern 1: Sequential Related Tasks

When building a feature, reuse the session for context:

```bash
# All tasks share context (async mode requires callback options)
openclaw-opencode task "Create User model with email/password fields" \
  --agent-id myagent --channel telegram --to @username
openclaw-opencode task "Add login endpoint using the User model" \
  --agent-id myagent --channel telegram --to @username
openclaw-opencode task "Write unit tests for login endpoint" \
  --agent-id myagent --channel telegram --to @username
```

### Pattern 2: Parallel Independent Tasks

For unrelated work, use `--new-session`:

```bash
# Task 1 - Feature A (async mode requires callback options)
openclaw-opencode task "Implement payment gateway" --new-session \
  --agent-id myagent --channel telegram --to @username

# Task 2 - Feature B (unrelated)
openclaw-opencode task "Fix homepage CSS" --new-session \
  --agent-id myagent --channel telegram --to @username
```

### Pattern 3: Blocking for Immediate Results

When you need results before continuing:

```bash
# Wait for code review
openclaw-opencode task "Review PR #123 for security issues" --wait

# Then act on results
# (OpenClaw receives callback with findings)
```

### Pattern 4: Project Switching

```bash
# Done with Project A
openclaw-opencode session --clear

# Start Project B (async mode requires callback options)
openclaw-opencode task "Setup project structure" --directory ./project-b \
  --agent-id myagent --channel telegram --to @username
```

## Workflow Examples

### Code Review Workflow

```bash
# Request review (non-blocking) - requires callback options
openclaw-opencode task "Review src/auth/* for security vulnerabilities" \
  --agent-id reviewer \
  --channel telegram \
  --to @username

# Later: check status if needed
openclaw-opencode status task-xyz789
```

### Feature Development Workflow

```bash
# 1. Create feature (async mode requires callback options)
openclaw-opencode task "Add user registration endpoint with validation" \
  --agent-id myagent --channel telegram --to @username

# 2. Add related functionality
openclaw-opencode task "Add email verification for new registrations" \
  --agent-id myagent --channel telegram --to @username

# 3. Test it
openclaw-opencode task "Write integration tests for registration flow" \
  --agent-id myagent --channel telegram --to @username

# 4. Clear session when done
openclaw-opencode session --clear
```

### Bug Fix Workflow

```bash
# Quick blocking fix (no callback options needed with --wait)
openclaw-opencode task "Fix null pointer exception in login handler" --wait

# Or non-blocking for complex fixes (requires callback options)
openclaw-opencode task "Investigate memory leak in data processing pipeline" \
  --agent-id myagent --channel telegram --to @username
```

## Output Format

### Task Dispatched (Non-blocking)
```
Task dispatched: task-abc123-def456
Callback registered. You will be notified when the task completes.
```

### Task Completed (Callback to OpenClaw)
```
Task completed: task-abc123-def456

Result:
I've reviewed the authentication code. Here are my findings:

1. Missing input validation in login() function
2. Password hashing uses outdated algorithm
3. No rate limiting on login attempts

Suggested fixes have been applied to src/auth/login.ts
```

### Session Info
```
Active session:
  Session ID: sess_abc123xyz
  Directory: /home/user/myproject
  Created at: 2024/01/15 10:30:45
```

## Troubleshooting

### Authentication Failed

```
Error: Callback failed: 401 Unauthorized
```

**Solutions:**
1. Verify `openclaw.openclawApiKey` matches `hooks.token`
2. Check `OPENCLAW_API_KEY` environment variable
3. Ensure tokens are identical (case-sensitive)

## Architecture

```
┌─────────────┐     1. Dispatch Task      ┌─────────────┐
│   OpenClaw  │ ─────────────────────────▶│   OpenCode  │
│   (CLI)     │                           │   (AI Agent)│
│             │     2. Register Callback  │             │
│             │ ─────────────────────────▶│  Plugin     │
│             │         (port 9090)       │  (port 9090)│
└─────────────┘                           └──────┬──────┘
     ▲                                           │
     │                                           │ 3. Execute
     │                                           │    Autonomously
     │                                           │
     │         4. Callback (SSE events)          │
     │◄──────────────────────────────────────────┘
     │            on completion
┌─────────────┐
│  Results    │
│  Delivered  │
└─────────────┘
```

## Security Notes

- **Bearer Token Auth:** All callbacks use token authentication
- **Agent Filtering:** OpenClaw restricts callbacks via `allowedAgentIds`

## Related Resources

- [OpenCode Documentation](https://opencode.ai/docs/server/)
- [Plugin Repository](https://github.com/LaceLetho/opencode-plugin-openclaw)
- [CLI Repository](https://github.com/LaceLetho/openclaw-opencode-cli)
