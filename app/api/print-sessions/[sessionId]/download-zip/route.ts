import { PassThrough } from "node:stream"
import { deflateRawSync } from "node:zlib"
import { NextRequest, NextResponse } from "next/server"
import { getSessionFilesWithData } from "@/lib/print-session-store"
import { resolveSessionId } from "../context-utils"

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let crc = i
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    }
    table[i] = crc >>> 0
  }
  return table
})()

function crc32(buffer: Buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

export const runtime = "nodejs"

interface RouteContext {
  params: { sessionId?: string } | Promise<{ sessionId?: string }>
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const sessionId = await resolveSessionId(params)
  if (!sessionId) {
    return NextResponse.json({ error: "invalid_session" }, { status: 400 })
  }

  try {
    const files = await getSessionFilesWithData(sessionId)
    if (!files.length) {
      return NextResponse.json({ error: "no_files" }, { status: 404 })
    }

    const output = new PassThrough()
    setImmediate(() => {
      try {
        let offset = 0
        const centralBuffers: Buffer[] = []
        for (const file of files) {
          const data = file.file_data
          const compressed = deflateRawSync(data)
          const crc = crc32(data)
          const nameBuffer = Buffer.from(file.file_name || `file-${file.id}`)

          const header = Buffer.alloc(30)
          header.writeUInt32LE(0x04034b50, 0)
          header.writeUInt16LE(20, 4)
          header.writeUInt16LE(0, 6)
          header.writeUInt16LE(8, 8)
          header.writeUInt16LE(0, 10)
          header.writeUInt16LE(0, 12)
          header.writeUInt32LE(crc, 14)
          header.writeUInt32LE(compressed.length, 18)
          header.writeUInt32LE(data.length, 22)
          header.writeUInt16LE(nameBuffer.length, 26)
          header.writeUInt16LE(0, 28)

          const localHeaderOffset = offset
          output.write(header)
          offset += header.length
          output.write(nameBuffer)
          offset += nameBuffer.length
          output.write(compressed)
          offset += compressed.length

          const central = Buffer.alloc(46)
          central.writeUInt32LE(0x02014b50, 0)
          central.writeUInt16LE(20, 4)
          central.writeUInt16LE(0, 6)
          central.writeUInt16LE(0, 8)
          central.writeUInt16LE(8, 10)
          central.writeUInt16LE(0, 12)
          central.writeUInt16LE(0, 14)
          central.writeUInt32LE(crc, 16)
          central.writeUInt32LE(compressed.length, 20)
          central.writeUInt32LE(data.length, 24)
          central.writeUInt16LE(nameBuffer.length, 28)
          central.writeUInt16LE(0, 30)
          central.writeUInt16LE(0, 32)
          central.writeUInt32LE(0, 34)
          central.writeUInt32LE(0, 38)
          central.writeUInt32LE(localHeaderOffset, 42)

          centralBuffers.push(Buffer.concat([central, nameBuffer]))
        }

        const centralStart = offset
        let centralSize = 0
        for (const entry of centralBuffers) {
          output.write(entry)
          offset += entry.length
          centralSize += entry.length
        }

        const eocdr = Buffer.alloc(22)
        eocdr.writeUInt32LE(0x06054b50, 0)
        eocdr.writeUInt16LE(0, 4)
        eocdr.writeUInt16LE(0, 6)
        eocdr.writeUInt16LE(files.length, 8)
        eocdr.writeUInt16LE(files.length, 10)
        eocdr.writeUInt32LE(centralSize, 12)
        eocdr.writeUInt32LE(centralStart, 16)
        eocdr.writeUInt16LE(0, 20)
        output.write(eocdr)
        offset += eocdr.length
        output.end()
      } catch (error) {
        output.destroy(error as Error)
      }
    })

    const disposition = encodeURIComponent(`library-print-${sessionId}.zip`)
    return new NextResponse(output, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${disposition}`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    const message = (error as Error).message
    return NextResponse.json({ error: message || "zip_failed" }, { status: 500 })
  }
}
