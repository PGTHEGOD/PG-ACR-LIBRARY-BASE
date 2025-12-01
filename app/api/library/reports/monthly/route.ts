import { NextRequest, NextResponse } from "next/server"
import { getMonthlyLoanReport } from "@/lib/server/library-service"

export const runtime = "nodejs"

function parseMonthParam(value: string | null): { year: number; month: number } {
  if (!value) {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  }
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

export async function GET(request: NextRequest) {
  try {
    const params = parseMonthParam(request.nextUrl.searchParams.get("month"))
    const report = await getMonthlyLoanReport(params.year, params.month)
    return NextResponse.json(report)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "ไม่สามารถสร้างรายงานได้" }, { status: 400 })
  }
}
