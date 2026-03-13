# OpenClaw ↔ OpenCode CLI Bridge

命令行工具，让 OpenClaw 可以发送任务给 OpenCode 并接收异步回调。

## 功能特性

- 🔗 **远程/本地双模式**: 支持连接远程 OpenCode 服务器或本地安装
- ⚡ **非阻塞执行**: 任务异步执行，完成后自动回调 OpenClaw
- 📊 **任务管理**: 查看任务状态、历史记录
- 🔒 **安全认证**: 支持 HTTP Basic Auth 和 Bearer Token
- 📝 **丰富帮助**: 详细的帮助信息和示例

## 为OpenClaw安装

```bash
npm install -g @laceletho/openclaw-opencode-cli
```

## 快速开始

### 1. 配置环境变量

**远程模式** :

#### 在 OpenClaw 环境设置（运行 CLI 的地方）
```bash
# 连接 OpenCode 服务器（远程模式）
export OPENCODE_URL=https://your-opencode-server.com
export OPENCODE_PASSWORD=your-password
```

#### 在 OpenCode 环境设置（OpenCode 服务器运行的环境）

**前提**：需要在 OpenCode 服务器上安装并启用 [`@laceletho/plugin-openclaw`](https://www.npmjs.com/package/@laceletho/plugin-openclaw) 插件，回调功能才能正常工作。

```bash
# 安装插件
npm install @laceletho/plugin-openclaw

# 在 opencode.json 中启用插件
{
  "plugins": ["@laceletho/plugin-openclaw"],
  "openclaw": {
    "openclawWebhookUrl": "http://localhost:18789/hooks/agent",
    "openclawApiKey": "your-openclaw-token"
  }
}

# 或使用环境变量配置
export OPENCLAW_CALLBACK_URL=http://localhost:18789/hooks/agent
export OPENCLAW_API_KEY=your-openclaw-token
```

**本地模式** :
```bash
# 只需安装 OpenCode
curl -fsSL https://opencode.ai/install | bash
```

### 2. 发送任务

```bash
# 非阻塞模式 (默认) - 返回 taskId，后台执行，完成后回调 OpenClaw
openclaw-opencode task "Write a Python function to calculate fibonacci"

# 阻塞模式 (等待完成) - 实时等待，结果输出到终端，不发送回调
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

| 变量 | 设置位置 | 必需 | 默认值 | 说明 |
|------|----------|------|--------|------|
| `OPENCODE_URL` | **OpenClaw 环境** | 远程模式 | - | OpenCode 服务器 URL |
| `OPENCODE_PASSWORD` | **OpenClaw 环境** | 远程模式 | - | HTTP Basic Auth 密码 |
| `OPENCODE_USERNAME` | **OpenClaw 环境** | 否 | opencode | HTTP Basic Auth 用户名 |
| `OPENCLAW_CALLBACK_URL` | **OpenCode 环境** | 否 | http://localhost:18789/hooks/agent | OpenClaw 回调地址 |
| `OPENCLAW_API_KEY` | **OpenCode 环境** | 否 | - | OpenClaw 认证 Token |
| `OPENCLAW_AGENT_ID` | **OpenClaw 环境** | 否 | main | 目标 Agent ID |
| `OPENCLAW_CHANNEL` | **OpenClaw 环境** | 否 | last | 投递频道 |
| `OPENCLAW_DELIVER` | **OpenClaw 环境** | 否 | true | 是否投递到消息频道 |

**注意**：`OPENCLAW_*` 回调相关变量仅在**非阻塞模式**（默认）下生效。阻塞模式（`--wait`）下任务结果直接输出到终端，不发送回调。

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

### 2. 在 OpenCode 环境配置插件和回调

确保已在 OpenCode 服务器上安装并启用 `@laceletho/plugin-openclaw` 插件：

```bash
# 安装插件
npm install @laceletho/plugin-openclaw
```

配置环境变量：
```bash
# 这些变量在 OpenCode 服务器运行的环境中设置
export OPENCLAW_API_KEY=your-secure-token
export OPENCLAW_CALLBACK_URL=http://localhost:18789/hooks/agent
```

或直接在 `opencode.json` 中配置插件。

### 3. 任务完成回调

非阻塞模式下，任务完成后 CLI 会自动发送回调到 OpenClaw（需要 `opencode-plugin-openclaw` 插件支持）：

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
