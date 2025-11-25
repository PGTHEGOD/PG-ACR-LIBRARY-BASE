import { NextRequest, NextResponse } from "next/server"
import { queryRows } from "@/lib/db"

interface LoanSummaryRow {
  classLevel: string
  category: string
  total: number
}

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const month = request.nextUrl.searchParams.get("month")
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "รูปแบบเดือนไม่ถูกต้อง (YYYY-MM)" }, { status: 400 })
    }

    const start = new Date(`${month}-01T00:00:00Z`)
    const end = new Date(start)
    end.setUTCMonth(end.getUTCMonth() + 1)

    const rows = await queryRows<LoanSummaryRow>(
      `SELECT COALESCE(s.class_level, 'ไม่ระบุ') AS classLevel,
              COALESCE(b.category, 'ไม่ระบุ') AS category,
              COUNT(*) AS total
         FROM library_loans l
         LEFT JOIN students s ON s.student_code = l.student_id
         LEFT JOIN library_books b ON b.assumption_code = l.assumption_code
        WHERE l.borrowed_at >= ?
          AND l.borrowed_at < ?
        GROUP BY classLevel, category
        ORDER BY classLevel, category`,
      [start, end]
    )

    return NextResponse.json({ month, rows })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "ไม่สามารถสร้างรายงานได้" }, { status: 500 })
  }
}
