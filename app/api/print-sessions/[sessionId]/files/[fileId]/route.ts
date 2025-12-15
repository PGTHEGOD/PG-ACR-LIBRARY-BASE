import { NextRequest, NextResponse } from "next/server"
import { getSessionFilePayload, markFileDownloaded } from "@/lib/print-session-store"

export const runtime = "nodejs"

interface RouteContext {
  params: { sessionId?: string; fileId?: string } | Promise<{ sessionId?: string; fileId?: string }>
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  let resolved: { sessionId?: string; fileId?: string } | null = null
  try {
    resolved = await Promise.resolve(params)
  } catch {
    resolved = null
  }
  const sessionId = resolved?.sessionId
  const fileId = resolved?.fileId
  if (!sessionId || !fileId) {
    return NextResponse.json({ error: "invalid_session" }, { status: 400 })
  }
  try {
    const payload = await getSessionFilePayload(sessionId, fileId)
    await markFileDownloaded(sessionId, fileId).catch(() => null)
    const arrayBuffer = payload.data.buffer.slice(
      payload.data.byteOffset,
      payload.data.byteOffset + payload.data.byteLength,
    ) as ArrayBuffer
    const blob = new Blob([arrayBuffer], { type: payload.type || "application/octet-stream" })
    const disposition = encodeURIComponent(payload.name || "library-print-file")
    return new NextResponse(blob.stream(), {
      status: 200,
      headers: {
        "Content-Type": payload.type || "application/octet-stream",
        "Content-Length": String(payload.size),
        "Content-Disposition": `inline; filename*=UTF-8''${disposition}`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    const message = (error as Error).message
    const status = message === "file_not_found" ? 404 : 400
    return NextResponse.json({ error: message || "file_not_found" }, { status })
  }
}
