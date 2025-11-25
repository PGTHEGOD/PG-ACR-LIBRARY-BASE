import { NextResponse } from "next/server"
import { getBookByCode } from "@/lib/server/library-service"

export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ code: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { code } = await context.params
    const book = await getBookByCode(code)
    if (!book) {
      return NextResponse.json({ error: "ไม่พบข้อมูลหนังสือ" }, { status: 404 })
    }
    return NextResponse.json(book)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "ไม่สามารถโหลดข้อมูลหนังสือได้" },
      { status: 500 }
    )
  }
}
