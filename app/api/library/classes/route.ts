import { NextResponse } from "next/server"
import { listClassRooms } from "@/lib/server/library-service"

export const runtime = "nodejs"

export async function GET() {
  try {
    const classes = await listClassRooms()
    return NextResponse.json({ classes })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "ไม่พบข้อมูล" }, { status: 500 })
  }
}
