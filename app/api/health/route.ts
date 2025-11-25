import { NextResponse } from "next/server"
import { queryRows } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  try {
    const [{ totalBooks = 0 } = {}] = await queryRows<{ totalBooks: number }>(
      "SELECT COUNT(*) AS totalBooks FROM library_books"
    )
    return NextResponse.json({ status: "ok", books: totalBooks })
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: (error as Error).message || "ไม่สามารถเข้าถึงคลังข้อมูล" },
      { status: 500 }
    )
  }
}
