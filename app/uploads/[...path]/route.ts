import { NextRequest, NextResponse } from "next/server"
import path from "node:path"
import fs from "node:fs/promises"

export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ path?: string[] }>
}

const baseUploadsDir = path.join(process.cwd(), "public", "uploads")

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg"
    case ".png":
      return "image/png"
    case ".gif":
      return "image/gif"
    case ".webp":
      return "image/webp"
    case ".svg":
      return "image/svg+xml"
    default:
      return "application/octet-stream"
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { path: segments = [] } = await context.params
    if (!segments.length) {
      return NextResponse.json({ error: "ไม่พบไฟล์ที่ต้องการ" }, { status: 404 })
    }

    const targetPath = path.join(baseUploadsDir, ...segments)
    if (!targetPath.startsWith(baseUploadsDir)) {
      return NextResponse.json({ error: "พาธไม่ถูกต้อง" }, { status: 400 })
    }

    const file = await fs.readFile(targetPath)
    const mimeType = getMimeType(targetPath)
    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    const message = (error as Error).message || "ไม่พบไฟล์"
    return NextResponse.json({ error: message }, { status: 404 })
  }
}
