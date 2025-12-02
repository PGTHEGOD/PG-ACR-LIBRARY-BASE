import { NextRequest, NextResponse } from "next/server"
import { listBarcodeRewardScans, logBarcodeRewardScan } from "@/lib/server/library-service"

export const runtime = "nodejs"

function parseMonthParam(value: string | null): { year: number; month: number } | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) {
    throw new Error("กรุณาระบุเดือนในรูปแบบ YYYY-MM")
  }
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error("รูปแบบเดือนไม่ถูกต้อง")
  }
  return { year, month }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const studentId = (body.studentId || "").toString().trim()
    if (!studentId) {
      return NextResponse.json({ error: "กรุณาระบุรหัสนักเรียน" }, { status: 400 })
    }
    const result = await logBarcodeRewardScan(studentId)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "ไม่สามารถบันทึกข้อมูลได้" }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const params = parseMonthParam(request.nextUrl.searchParams.get("month"))
    const report = await listBarcodeRewardScans(params?.year, params?.month)
    return NextResponse.json(report)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "ไม่สามารถโหลดประวัติได้" }, { status: 400 })
  }
}
