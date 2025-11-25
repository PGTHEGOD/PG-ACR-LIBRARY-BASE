import { NextResponse } from "next/server"
import { getStudentProfile } from "@/lib/server/library-service"

export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ studentId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { studentId } = await context.params
    const profile = await getStudentProfile(studentId)
    if (!profile) {
      return NextResponse.json({ error: "ไม่พบนักเรียน" }, { status: 404 })
    }
    return NextResponse.json(profile)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "ไม่สามารถโหลดข้อมูลนักเรียนได้" },
      { status: 500 }
    )
  }
}
