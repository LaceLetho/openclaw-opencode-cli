# OpenClaw ↔ OpenCode CLI Bridge

命令行工具，让 OpenClaw 可以发送任务给 OpenCode 并接收异步回调。

## 功能特性

- 🔗 **远程/本地双模式**: 支持连接远程 OpenCode 服务器或本地安装
- ⚡ **非阻塞执行**: 任务异步执行，完成后自动回调 OpenClaw
- 📊 **任务管理**: 查看任务状态、历史记录
- 🔒 **安全认证**: 支持 HTTP Basic Auth 和 Bearer Token
- 📝 **丰富帮助**: 详细的帮助信息和示例

## 安装

```bash
npm install -g @laceletho/openclaw-opencode-cli
```

## 快速开始

### 1. 配置环境变量

**远程模式** (推荐用于生产):
```bash
export OPENCODE_URL=https://your-opencode-server.com
export OPENCODE_PASSWORD=your-password
export OPENCLAW_CALLBACK_URL=http://localhost:18789/hooks/agent
export OPENCLAW_API_KEY=your-openclaw-token
```

**本地模式** (开发):
```bash
# 只需安装 OpenCode
curl -fsSL https://opencode.ai/install | bash
```

### 2. 发送任务

```bash
# 非阻塞模式 (默认)
openclaw-opencode task "Write a Python function to calculate fibonacci"

# 阻塞模式 (等待完成)
openclaw-opencode task "Create a React component" --wait
```

### 3. 查看任务状态

```bash
# 查看特定任务
openclaw-opencode status task-1234567890-abc12

# 列出所有任务
openclaw-opencode list
```

## 命令详解

### `task` - 发送任务

```bash
openclaw-opencode task <prompt> [options]
```

**参数:**
- `prompt` - 要发送给 OpenCode 的任务描述

**选项:**
- `-c, --callback-url <url>` - OpenClaw 回调 URL
- `-a, --agent-id <id>` - OpenClaw Agent ID (默认: main)
- `--channel <channel>` - 消息投递频道 (默认: last)
- `--no-deliver` - 不投递到消息频道
- `-d, --directory <dir>` - 工作目录
- `-w, --wait` - 阻塞模式等待完成
- `-t, --timeout <minutes>` - 超时时间 (默认: 30)

**示例:**
```bash
openclaw-opencode task "Write tests for this file" --wait
openclaw-opencode task "Review code" --agent-id reviewer --channel slack
```

### `status` - 查看任务状态

```bash
openclaw-opencode status <taskId>
```

### `list` - 列出所有任务

```bash
openclaw-opencode list
openclaw-opencode list --clear  # 清除已完成任务
```

## 环境变量

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `OPENCODE_URL` | 远程模式 | - | OpenCode 服务器 URL |
| `OPENCODE_PASSWORD` | 远程模式 | - | HTTP Basic Auth 密码 |
| `OPENCODE_USERNAME` | 否 | opencode | HTTP Basic Auth 用户名 |
| `OPENCLAW_CALLBACK_URL` | 否 | http://localhost:18789/hooks/agent | OpenClaw 回调地址 |
| `OPENCLAW_API_KEY` | 否 | - | OpenClaw 认证 Token |
| `OPENCLAW_AGENT_ID` | 否 | main | 目标 Agent ID |
| `OPENCLAW_CHANNEL` | 否 | last | 投递频道 |
| `OPENCLAW_DELIVER` | 否 | true | 是否投递到消息频道 |

## OpenClaw 集成

### 1. 配置 OpenClaw Hooks

在 `~/.openclaw/openclaw.json` 中启用 hooks:

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

### 2. 配置 CLI 环境变量

```bash
export OPENCLAW_API_KEY=your-secure-token
export OPENCLAW_CALLBACK_URL=http://localhost:18789/hooks/agent
```

### 3. 任务完成回调

任务完成后，CLI 会自动发送回调到 OpenClaw:

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

## 架构

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

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 类型检查
npm run typecheck
```

## 许可证

MIT
