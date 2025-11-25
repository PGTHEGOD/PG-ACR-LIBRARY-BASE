import { NextResponse } from "next/server"
import { returnBook } from "@/lib/server/library-service"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const studentId = body?.studentId?.toString?.().trim() || ""
    const code = body?.code?.toString?.().trim() || ""
    if (!studentId || !code) {
      return NextResponse.json({ error: "กรุณาระบุรหัสนักเรียนและบาร์โค้ดหนังสือ" }, { status: 400 })
    }
    const result = await returnBook(studentId, code)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "ไม่สามารถบันทึกการคืนได้" },
      { status: 400 }
    )
  }
}
