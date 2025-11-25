import { NextResponse } from "next/server"
import { adjustPoints, getStudentProfile } from "@/lib/server/library-service"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const studentId = body?.studentId?.toString?.().trim() || ""
    const change = Number(body?.points ?? 0)
    const note = body?.note?.toString?.().trim() || "ปรับคะแนน"
    if (!studentId || !Number.isFinite(change) || !change) {
      return NextResponse.json({ error: "กรุณาระบุรหัสนักเรียนและคะแนน" }, { status: 400 })
    }
    await adjustPoints(studentId, change, note)
    const profile = await getStudentProfile(studentId)
    return NextResponse.json(profile)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "ไม่สามารถบันทึกคะแนนได้" },
      { status: 400 }
    )
  }
}
