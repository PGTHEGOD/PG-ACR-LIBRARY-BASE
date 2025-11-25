import { NextResponse } from "next/server"
import { getStudentByCode } from "@/lib/server/student-service"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  { params }: { params: { studentCode: string } }
) {
  try {
    const student = await getStudentByCode(params.studentCode)
    if (!student) {
      return NextResponse.json({ error: "ไม่พบนักเรียน" }, { status: 404 })
    }
    return NextResponse.json({ student })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
