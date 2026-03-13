import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { homedir } from "os"

export interface Task {
  taskId: string
  sessionId: string
  prompt: string
  status: "pending" | "running" | "completed" | "failed"
  result?: string
  error?: string
  createdAt: Date
  completedAt?: Date
}

const STORE_DIR = join(homedir(), ".@laceletho-openclaw-opencode-cli")
const STORE_FILE = join(STORE_DIR, "tasks.json")
const SESSION_FILE = join(STORE_DIR, "session.json")

function ensureStore(): void {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true })
  }
}

function readStore(): Task[] {
  ensureStore()
  
  if (!existsSync(STORE_FILE)) {
    return []
  }

  try {
    const data = JSON.parse(readFileSync(STORE_FILE, "utf-8"))
    return data.map((t: any) => ({
      ...t,
      createdAt: new Date(t.createdAt),
      completedAt: t.completedAt ? new Date(t.completedAt) : undefined
    }))
  } catch {
    return []
  }
}

function writeStore(tasks: Task[]): void {
  ensureStore()
  writeFileSync(STORE_FILE, JSON.stringify(tasks, null, 2))
}

export function storeTask(task: Task): void {
  const tasks = readStore()
  tasks.push(task)
  writeStore(tasks)
}

export function getTask(taskId: string): Task | undefined {
  const tasks = readStore()
  return tasks.find(t => t.taskId === taskId)
}

export function listTasks(): Task[] {
  return readStore()
}

export function updateTaskStatus(
  taskId: string,
  status: Task["status"],
  result?: string,
  error?: string
): void {
  const tasks = readStore()
  const task = tasks.find(t => t.taskId === taskId)
  
  if (task) {
    task.status = status
    if (result) task.result = result
    if (error) task.error = error
    if (status === "completed" || status === "failed") {
      task.completedAt = new Date()
    }
    writeStore(tasks)
  }
}

export function clearCompletedTasks(): number {
  const tasks = readStore()
  const initialCount = tasks.length
  const activeTasks = tasks.filter(t => t.status !== "completed" && t.status !== "failed")
  writeStore(activeTasks)
  return initialCount - activeTasks.length
}

// Session management
export interface SessionInfo {
  sessionId: string
  directory?: string
  createdAt: Date
}

function readSessionStore(): SessionInfo | null {
  ensureStore()

  if (!existsSync(SESSION_FILE)) {
    return null
  }

  try {
    const data = JSON.parse(readFileSync(SESSION_FILE, "utf-8"))
    return {
      ...data,
      createdAt: new Date(data.createdAt)
    }
  } catch {
    return null
  }
}

function writeSessionStore(session: SessionInfo | null): void {
  ensureStore()
  if (session) {
    writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2))
  } else {
    writeFileSync(SESSION_FILE, JSON.stringify({}))
  }
}

export function getActiveSession(): SessionInfo | null {
  return readSessionStore()
}

export function setActiveSession(sessionId: string, directory?: string): void {
  writeSessionStore({
    sessionId,
    directory,
    createdAt: new Date()
  })
}

export function clearActiveSession(): void {
  writeSessionStore(null)
}
