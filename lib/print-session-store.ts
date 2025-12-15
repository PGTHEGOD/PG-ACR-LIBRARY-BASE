import crypto from "node:crypto"
import { execute, executeAndGet, queryRows } from "@/lib/db"

export interface PrintSessionFile {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: number
  downloadedAt?: number | null
}

export interface PrintSessionRecord {
  id: string
  createdAt: number
  expiresAt: number
  used: boolean
  files: PrintSessionFile[]
}

interface SessionRow {
  id: string
  created_at: Date
  expires_at: Date
  used: number
}

interface FileRow {
  id: number
  session_id: string
  file_name: string
  file_type: string
  file_size: number
  uploaded_at: Date
  downloaded_at: Date | null
}

interface FileDataRow extends FileRow {
  file_data: Buffer
}

export interface UploadedPrintFile {
  name: string
  type: string
  size: number
  buffer: Buffer
}

const SESSION_TTL_MS = 1000 * 60 * 10
const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000

function toTimestamp(value: Date | string | number): number {
  if (value instanceof Date) return value.getTime()
  return new Date(value).getTime()
}

function mapFileRow(row: FileRow): PrintSessionFile {
  return {
    id: String(row.id),
    name: row.file_name,
    type: row.file_type,
    size: Number(row.file_size),
    uploadedAt: toTimestamp(row.uploaded_at),
    downloadedAt: row.downloaded_at ? toTimestamp(row.downloaded_at) : null,
  }
}

async function cleanupExpiredSessions() {
  await execute("DELETE FROM library_print_sessions WHERE expires_at < UTC_TIMESTAMP()")
}

export async function createPrintSession(): Promise<PrintSessionRecord> {
  await cleanupExpiredSessions()
  const id = crypto.randomUUID()
  await execute(
    "INSERT INTO library_print_sessions (id, created_at, expires_at, used, offer, answer) VALUES (?, UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND), 0, NULL, NULL)",
    [id, SESSION_TTL_SECONDS],
  )
  const session = await getPrintSession(id)
  if (!session) {
    throw new Error("session_not_found")
  }
  return session
}

export async function getPrintSession(id: string): Promise<PrintSessionRecord | null> {
  await cleanupExpiredSessions()
  const rows = await queryRows<SessionRow>(
    "SELECT id, created_at, expires_at, used FROM library_print_sessions WHERE id = ? LIMIT 1",
    [id],
  )
  const session = rows[0]
  if (!session) {
    return null
  }
  const fileRows = await queryRows<FileRow>(
    "SELECT id, session_id, file_name, file_type, file_size, uploaded_at, downloaded_at FROM library_print_files WHERE session_id = ? ORDER BY uploaded_at ASC, id ASC",
    [id],
  )
  const createdAt = toTimestamp(session.created_at)
  const expiresAt = toTimestamp(session.expires_at)
  return {
    id: session.id,
    createdAt,
    expiresAt,
    used: Boolean(session.used),
    files: fileRows.map(mapFileRow),
  }
}

export async function recordSessionFile(sessionId: string, file: UploadedPrintFile): Promise<PrintSessionFile> {
  await cleanupExpiredSessions()
  const session = await getPrintSession(sessionId)
  if (!session || session.expiresAt <= Date.now()) {
    throw new Error("session_not_available")
  }
  const result = await executeAndGet(
    "INSERT INTO library_print_files (session_id, file_name, file_type, file_size, file_data, uploaded_at, downloaded_at) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), NULL)",
    [sessionId, file.name, file.type, file.size, file.buffer],
  )
  const insertedId = result.insertId
  return {
    id: String(insertedId),
    name: file.name,
    type: file.type,
    size: file.size,
    uploadedAt: Date.now(),
    downloadedAt: null,
  }
}

export async function getSessionFilePayload(sessionId: string, fileId: string): Promise<{
  name: string
  type: string
  size: number
  data: Buffer
}> {
  const rows = await queryRows<FileDataRow>(
    "SELECT id, session_id, file_name, file_type, file_size, file_data, uploaded_at, downloaded_at FROM library_print_files WHERE session_id = ? AND id = ? LIMIT 1",
    [sessionId, Number(fileId)],
  )
  const row = rows[0]
  if (!row) {
    throw new Error("file_not_found")
  }
  return {
    name: row.file_name,
    type: row.file_type,
    size: Number(row.file_size),
    data: row.file_data,
  }
}

export async function markFileDownloaded(sessionId: string, fileId: string) {
  await execute("UPDATE library_print_files SET downloaded_at = UTC_TIMESTAMP() WHERE session_id = ? AND id = ?", [
    sessionId,
    Number(fileId),
  ])
}

export async function consumePrintSession(id: string) {
  await cleanupExpiredSessions()
  const result = await executeAndGet("DELETE FROM library_print_sessions WHERE id = ?", [id])
  if (result.affectedRows === 0) {
    throw new Error("session_not_available")
  }
}

export function serializeSessionView(session: PrintSessionRecord) {
  return {
    id: session.id,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    used: session.used,
    files: session.files.map((file) => ({
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: file.uploadedAt,
      downloadedAt: file.downloadedAt ?? null,
    })),
  }
}
