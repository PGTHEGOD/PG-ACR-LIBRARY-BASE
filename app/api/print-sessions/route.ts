import { NextResponse } from "next/server"
import { createPrintSession } from "@/lib/print-session-store"

export const runtime = "nodejs"

export async function POST() {
  const session = await createPrintSession()
  return NextResponse.json({
    id: session.id,
    expiresAt: session.expiresAt,
  })
}
