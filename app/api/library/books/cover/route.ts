import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"

export const runtime = "nodejs"

const MAX_SIZE_MB = 5
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("cover")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "ไม่พบไฟล์ภาพ" }, { status: 400 })
    }

    if (!file.type?.startsWith("image/")) {
      return NextResponse.json({ error: "รองรับเฉพาะไฟล์ภาพ" }, { status: 400 })
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: `ขนาดไฟล์ต้องไม่เกิน ${MAX_SIZE_MB} MB` }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const extension = file.type.split("/")[1] || "jpg"
    const fileName = `${crypto.randomUUID()}.${extension}`
    const uploadDir = process.env.COVER_UPLOAD_DIR || path.join(process.cwd(), "public/uploads")

    await fs.mkdir(uploadDir, { recursive: true })
    const filePath = path.join(uploadDir, fileName)
    await fs.writeFile(filePath, buffer)

    const baseUrl = process.env.NEXT_PUBLIC_COVER_BASE_URL || "/uploads"
    const url = `${baseUrl.replace(/\/$/, "")}/${fileName}`

    return NextResponse.json({ url })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "อัปโหลดรูปไม่สำเร็จ" },
      { status: 500 }
    )
  }
}
