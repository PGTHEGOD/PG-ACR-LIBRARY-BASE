import { NextRequest, NextResponse } from "next/server"
import { jsonrepair } from "jsonrepair"
import { parse as parseJsonLines } from "jsonlines"

import { deleteBooksByCodes, importBooks, listBookCodes } from "@/lib/server/library-service"
import type { BookInput } from "@/lib/types"

export const runtime = "nodejs"

type WorksheetRow = Record<string, unknown>

const currentYear = new Date().getFullYear()

function getValue(row: WorksheetRow, ...keys: string[]): string {
  for (const key of keys) {
    if (key in row && row[key] !== undefined && row[key] !== null) {
      return row[key]!.toString()
    }
  }
  return ""
}

function mapWorksheetRow(row: WorksheetRow): BookInput {
  const assumptionCode = getValue(row, "assumptionCode", "รหัสอัสสัม", "รหัส", "รหัสประจำตัว").trim()
  const barcode = getValue(row, "barcode", "บาร์โค้ด", "barcodeNumber", "รหัสหนังสือ").trim() || assumptionCode
  const category = getValue(row, "category", "หมวด", "หมวดหมู่").trim() || "ทั่วไป"
  const shelfCode = getValue(row, "shelfCode", "shelf", "ชั้น", "หมวดชั้น", "หมู่").trim() || "GEN"
  const title = getValue(row, "title", "ชื่อ", "ชื่อหนังสือ").trim()
  const author = getValue(row, "author", "ผู้แต่ง").trim()

  const publishYearRaw = getValue(row, "publishYear", "ปีที่พิมพ์", "ปีที่ พิมพ์")
  const pagesRaw = getValue(row, "pages", "จำนวนหน้า")
  const priceRaw = getValue(row, "price", "ราคา")

  const parseNumber = (value: string, fallback: number) => {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : fallback
  }

  return {
    assumptionCode,
    barcode,
    category,
    shelfCode,
    authorCode: getValue(row, "authorCode", "รหัสผู้แต่ง"),
    edition: getValue(row, "edition", "ฉบับที่"),
    volumeNumber: getValue(row, "volumeNumber", "เล่มที่"),
    language: getValue(row, "language", "ภาษา"),
    printNumber: getValue(row, "printNumber", "พิมพ์ครั้งที่"),
    purchaseDate: getValue(row, "purchaseDate", "วันที่ซื้อ"),
    source: getValue(row, "source", "แหล่งที่มา"),
    title,
    isbn: getValue(row, "isbn", "ISBN"),
    subject: getValue(row, "subject", "หัวเรื่อง"),
    author,
    publisher: getValue(row, "publisher", "สำนักพิมพ์"),
    publishYear: parseNumber(publishYearRaw, currentYear),
    pages: parseNumber(pagesRaw, 0),
    price: parseNumber(priceRaw, 0),
    coverUrl: getValue(row, "coverUrl", "ปก"),
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || ""
    let rawBody = ""
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const file = formData.get("file")
      const inlinePayload = formData.get("payload")
      if (file instanceof File) {
        rawBody = (await file.text()) || ""
      } else if (typeof inlinePayload === "string") {
        rawBody = inlinePayload
      }
    } else {
      rawBody = await request.text()
    }

    if (!rawBody.trim()) {
      return NextResponse.json({ error: "ไม่พบข้อมูลหนังสือ" }, { status: 400 })
    }

    const sanitized = rawBody.replace(/^\uFEFF/, "").trim()
    let payload: any
    let parseError: Error | null = null
    const attempts: Array<() => any> = [
      () => JSON.parse(sanitized),
      () => JSON.parse(jsonrepair(sanitized)),
      () => parseJsonLines(sanitized),
    ]

    for (const attempt of attempts) {
      try {
        payload = attempt()
        parseError = null
        break
      } catch (err) {
        parseError = err as Error
      }
    }

    if (!payload) {
      return NextResponse.json(
        { error: `ไฟล์ไม่อยู่ในรูปแบบ JSON ที่รองรับ: ${parseError?.message || "ไม่สามารถอ่านไฟล์ได้"}` },
        { status: 400 }
      )
    }

    const worksheet: WorksheetRow[] = Array.isArray(payload)
      ? payload
      : payload?.Worksheet || payload?.worksheet || payload?.books || payload?.data || []

    if (!Array.isArray(worksheet) || worksheet.length === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลรายชื่อหนังสือในไฟล์" }, { status: 400 })
    }

    let skippedMissing = 0
    const mappedRows = worksheet.map((row) => {
      const mapped = mapWorksheetRow(row)
      if (!mapped.assumptionCode || !mapped.title) {
        skippedMissing += 1
        return null
      }
      return mapped
    })

    const rows = mappedRows.filter(Boolean) as BookInput[]

    if (!rows.length) {
      return NextResponse.json({ error: "ไม่พบแถวที่มีข้อมูลเพียงพอ" }, { status: 400 })
    }

    const uniqueMap = new Map<string, BookInput>()
    const duplicateCodes: string[] = []
    for (const record of rows) {
      const key = record.assumptionCode.trim()
      if (uniqueMap.has(key)) {
        duplicateCodes.push(key)
        continue
      }
      uniqueMap.set(key, record)
    }
    const uniqueRows = Array.from(uniqueMap.values())

    const existingCodes = await listBookCodes()
    const incomingSet = new Set(uniqueRows.map((row) => row.assumptionCode.trim()))
    const missingExisting = existingCodes.filter((code) => !incomingSet.has(code))

    const action = request.nextUrl.searchParams.get("action")
    if (missingExisting.length > 0) {
      if (action === "delete") {
        await deleteBooksByCodes(missingExisting)
      } else if (action !== "update") {
        const sample = missingExisting.slice(0, 10)
        return NextResponse.json(
          {
            warning: `ตรวจพบหนังสือในระบบที่ไม่มีในไฟล์นำเข้า ${missingExisting.length} รายการ`,
            missingCount: missingExisting.length,
            sampleCodes: sample,
          },
          { status: 409 }
        )
      }
    }

    const result = await importBooks(uniqueRows)

    return NextResponse.json({
      processed: result.processed,
      uniqueRows: uniqueRows.length,
      skippedMissing,
      duplicateCount: duplicateCodes.length,
      duplicateSamples: duplicateCodes.slice(0, 20),
    })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "นำเข้าหนังสือไม่สำเร็จ" }, { status: 500 })
  }
}
