import { NextRequest, NextResponse } from "next/server"
import { consumePrintSession, getPrintSession, serializeSessionView } from "@/lib/print-session-store"
import { resolveSessionId } from "./context-utils"

export const runtime = "nodejs"

interface RouteContext {
  params: { sessionId?: string } | Promise<{ sessionId?: string }>
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const sessionId = await resolveSessionId(params)
  if (!sessionId) {
    return NextResponse.json({ error: "invalid_session" }, { status: 400 })
  }
  const session = await getPrintSession(sessionId)
  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 })
  }
  const expired = session.expiresAt <= Date.now()
  return NextResponse.json({
    ...serializeSessionView(session),
    expired,
  })
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const sessionId = await resolveSessionId(params)
  if (!sessionId) {
    return NextResponse.json({ error: "invalid_session" }, { status: 400 })
  }
  const payload = await request.json().catch(() => ({}))
  const action = payload?.action
  try {
    switch (action) {
      case "consume": {
        await consumePrintSession(sessionId)
        break
      }
      default: {
        return NextResponse.json({ error: "invalid_action" }, { status: 400 })
      }
    }
    const view = await getPrintSession(sessionId)
    return NextResponse.json(
      view
        ? {
            ...serializeSessionView(view),
            expired: view.expiresAt <= Date.now(),
          }
        : { ok: true },
    )
  } catch (error) {
    const message = (error as Error).message
    if (message === "session_not_available") {
      return NextResponse.json({ error: "session_not_available" }, { status: 410 })
    }
    return NextResponse.json({ error: message || "unknown_error" }, { status: 400 })
  }
}
