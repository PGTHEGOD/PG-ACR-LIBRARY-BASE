import { NextRequest, NextResponse } from "next/server"
import { listBooks } from "@/lib/server/library-service"

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
