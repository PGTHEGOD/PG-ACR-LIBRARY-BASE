const TEXT_ENCODER = new TextEncoder()

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function columnLetter(index: number): string {
  let result = ""
  let i = index
  while (i >= 0) {
    result = String.fromCharCode((i % 26) + 65) + result
    i = Math.floor(i / 26) - 1
  }
  return result
}

function buildWorksheetXml(headers: string[], rows: Array<(string | number)[]>): string {
  const allRows = [headers, ...rows]
  const rowsXml = allRows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, cellIndex) => {
          const cellRef = `${columnLetter(cellIndex)}${rowIndex + 1}`
          if (typeof value === "number" && Number.isFinite(value)) {
            return `<c r="${cellRef}"><v>${value}</v></c>`
          }
          const text = escapeXml(String(value ?? ""))
          return `<c r="${cellRef}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`
        })
        .join("")
      return `<row r="${rowIndex + 1}">${cells}</row>`
    })
    .join("")

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetData>${rowsXml}</sheetData>` +
    `</worksheet>`
}

function buildWorkbookXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`
}

function buildWorkbookRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `</Relationships>`
}

function buildRootRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`
}

function buildContentTypes(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `</Types>`
}

function crc32(buffer: Uint8Array): number {
  let crc = -1
  for (let i = 0; i < buffer.length; i++) {
    let byte = buffer[i]
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff]
  }
  return (crc ^ -1) >>> 0
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

interface ZipFileEntry {
  path: string
  data: string
}

function createZip(entries: ZipFileEntry[]): Uint8Array {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  entries.forEach((entry) => {
    const data = TEXT_ENCODER.encode(entry.data)
    const nameBytes = TEXT_ENCODER.encode(entry.path)
    const crc = crc32(data)

    const localHeader = new Uint8Array(30 + nameBytes.length + data.length)
    const view = new DataView(localHeader.buffer)
    let ptr = 0
    view.setUint32(ptr, 0x04034b50, true); ptr += 4
    view.setUint16(ptr, 20, true); ptr += 2 // version needed
    view.setUint16(ptr, 0, true); ptr += 2 // flags
    view.setUint16(ptr, 0, true); ptr += 2 // compression
    view.setUint16(ptr, 0, true); ptr += 2 // mod time
    view.setUint16(ptr, 0, true); ptr += 2 // mod date
    view.setUint32(ptr, crc, true); ptr += 4
    view.setUint32(ptr, data.length, true); ptr += 4
    view.setUint32(ptr, data.length, true); ptr += 4
    view.setUint16(ptr, nameBytes.length, true); ptr += 2
    view.setUint16(ptr, 0, true); ptr += 2
    localHeader.set(nameBytes, ptr)
    ptr += nameBytes.length
    localHeader.set(data, ptr)

    localParts.push(localHeader)

    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const centralView = new DataView(centralHeader.buffer)
    ptr = 0
    centralView.setUint32(ptr, 0x02014b50, true); ptr += 4
    centralView.setUint16(ptr, 20, true); ptr += 2 // version made by
    centralView.setUint16(ptr, 20, true); ptr += 2 // version needed
    centralView.setUint16(ptr, 0, true); ptr += 2 // flags
    centralView.setUint16(ptr, 0, true); ptr += 2 // compression
    centralView.setUint16(ptr, 0, true); ptr += 2 // mod time
    centralView.setUint16(ptr, 0, true); ptr += 2 // mod date
    centralView.setUint32(ptr, crc, true); ptr += 4
    centralView.setUint32(ptr, data.length, true); ptr += 4
    centralView.setUint32(ptr, data.length, true); ptr += 4
    centralView.setUint16(ptr, nameBytes.length, true); ptr += 2
    centralView.setUint16(ptr, 0, true); ptr += 2 // extra
    centralView.setUint16(ptr, 0, true); ptr += 2 // comment
    centralView.setUint16(ptr, 0, true); ptr += 2 // disk
    centralView.setUint16(ptr, 0, true); ptr += 2 // internal attrs
    centralView.setUint32(ptr, 0, true); ptr += 4 // external attrs
    centralView.setUint32(ptr, offset, true); ptr += 4
    centralHeader.set(nameBytes, ptr)
    centralParts.push(centralHeader)

    offset += localHeader.length
  })

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const centralOffset = offset

  const endRecord = new Uint8Array(22)
  const endView = new DataView(endRecord.buffer)
  let ptr = 0
  endView.setUint32(ptr, 0x06054b50, true); ptr += 4
  endView.setUint16(ptr, 0, true); ptr += 2
  endView.setUint16(ptr, 0, true); ptr += 2
  endView.setUint16(ptr, entries.length, true); ptr += 2
  endView.setUint16(ptr, entries.length, true); ptr += 2
  endView.setUint32(ptr, centralSize, true); ptr += 4
  endView.setUint32(ptr, centralOffset, true); ptr += 4
  endView.setUint16(ptr, 0, true)

  const totalLength = offset + centralSize + endRecord.length
  const result = new Uint8Array(totalLength)
  let currentOffset = 0
  for (const part of localParts) {
    result.set(part, currentOffset)
    currentOffset += part.length
  }
  for (const part of centralParts) {
    result.set(part, currentOffset)
    currentOffset += part.length
  }
  result.set(endRecord, currentOffset)
  return result
}

export function createXlsxBlob(headers: string[], rows: Array<(string | number)[]>): Blob {
  const worksheetXml = buildWorksheetXml(headers, rows)
  const entries: ZipFileEntry[] = [
    { path: "[Content_Types].xml", data: buildContentTypes() },
    { path: "_rels/.rels", data: buildRootRels() },
    { path: "xl/workbook.xml", data: buildWorkbookXml() },
    { path: "xl/_rels/workbook.xml.rels", data: buildWorkbookRels() },
    { path: "xl/worksheets/sheet1.xml", data: worksheetXml },
  ]
  const zipBytes = createZip(entries)
  return new Blob([zipBytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
}
