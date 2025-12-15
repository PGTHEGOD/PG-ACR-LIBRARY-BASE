import { NextRequest, NextResponse } from "next/server"
import { recordSessionFile } from "@/lib/print-session-store"
import { resolveSessionId } from "../context-utils"

export const runtime = "nodejs"

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024 // 25 MB

interface RouteContext {
  params: { sessionId?: string } | Promise<{ sessionId?: string }>
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const sessionId = await resolveSessionId(params)
  if (!sessionId) {
    return NextResponse.json({ error: "invalid_session" }, { status: 400 })
  }
  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 })
  }
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 })
  }
  if (!file.size) {
    return NextResponse.json({ error: "empty_file" }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 })
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  try {
    const stored = await recordSessionFile(sessionId, {
      name: file.name || "upload",
      type: file.type || "application/octet-stream",
      size: buffer.length,
      buffer,
    })
    return NextResponse.json({
      file: stored,
    })
  } catch (error) {
    const message = (error as Error).message
    if (message === "session_not_available") {
      return NextResponse.json({ error: "session_not_available" }, { status: 410 })
    }
    return NextResponse.json({ error: message || "upload_failed" }, { status: 400 })
  }
}
