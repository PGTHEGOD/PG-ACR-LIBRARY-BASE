import { NextRequest, NextResponse } from "next/server"
import { addBook, deleteBook, listBooks, updateBook } from "@/lib/server/library-service"
import type { BookInput } from "@/lib/types"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("q") || request.nextUrl.searchParams.get("search") || undefined
    const page = Number(request.nextUrl.searchParams.get("page") || "1")
    const perPage = Number(request.nextUrl.searchParams.get("perPage") || "25")
    const result = await listBooks(search, Number.isFinite(page) ? page : 1, Number.isFinite(perPage) ? perPage : 25)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "ไม่สามารถโหลดรายชื่อหนังสือได้" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<BookInput>
    const required: Array<keyof BookInput> = [
      "assumptionCode",
      "barcode",
      "category",
      "shelfCode",
      "authorCode",
      "edition",
      "title",
      "isbn",
      "subject",
      "author",
      "publisher",
      "publishYear",
      "pages",
      "price",
    ]
    const missing = required.filter((key) => !body[key])
    if (missing.length) {
      return NextResponse.json(
        { error: `กรุณากรอกข้อมูลให้ครบถ้วน (${missing.join(", ")})` },
        { status: 400 }
      )
    }
    const record = await addBook(body as BookInput)
    return NextResponse.json(record)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "ไม่สามารถเพิ่มหนังสือได้" },
      { status: 400 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<BookInput>
    if (!body.assumptionCode) {
      return NextResponse.json({ error: "กรุณาระบุรหัสอัสสัม" }, { status: 400 })
    }
    const record = await updateBook(body as BookInput)
    return NextResponse.json(record)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "ไม่สามารถแก้ไขหนังสือได้" },
      { status: 400 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { assumptionCode?: string }
    if (!body.assumptionCode?.trim()) {
      return NextResponse.json({ error: "กรุณาระบุรหัสหนังสือ" }, { status: 400 })
    }
    await deleteBook(body.assumptionCode)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "ไม่สามารถลบหนังสือได้" },
      { status: 400 }
    )
  }
}
