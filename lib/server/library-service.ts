import { execute, queryRows } from "@/lib/db"
import { getStudentByCode } from "@/lib/server/student-service"
import type { BookInput, BookRecord, LoanRecord, ScoreEntry, LibraryStudentProfile } from "@/lib/types"

function sanitizeNumber(value: unknown, fallback: number): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function sanitizeBookInput(input: BookInput): BookInput {
  const currentYear = new Date().getFullYear()
  return {
    assumptionCode: input.assumptionCode?.toString().trim(),
    barcode: input.barcode?.toString().trim(),
    category: input.category?.toString().trim(),
    shelfCode: input.shelfCode?.toString().trim(),
    authorCode: input.authorCode?.toString().trim() || "",
    edition: input.edition?.toString().trim() || "",
    volumeNumber: input.volumeNumber?.toString().trim() || "",
    language: input.language?.toString().trim() || "",
    printNumber: input.printNumber?.toString().trim() || "",
    purchaseDate: input.purchaseDate?.toString().substring(0, 10) || "",
    source: input.source?.toString().trim() || "",
    title: input.title?.toString().trim(),
    isbn: input.isbn?.toString().trim() || "",
    subject: input.subject?.toString().trim() || "",
    author: input.author?.toString().trim() || "",
    publisher: input.publisher?.toString().trim() || "",
    publishYear: sanitizeNumber(input.publishYear, currentYear),
    pages: sanitizeNumber(input.pages, 0),
    price: sanitizeNumber(input.price, 0),
    coverUrl: input.coverUrl?.toString().trim() || "",
  }
}

function buildCoverUrl(row: any): string {
  const explicit = row.cover_url?.toString().trim()
  if (explicit) return explicit

  const normalizedIsbn = row.isbn?.toString().replace(/[^0-9Xx]/g, "").trim()
  if (normalizedIsbn) {
    return `https://covers.openlibrary.org/b/isbn/${normalizedIsbn}-L.jpg`
  }

  const olid = row.open_library_id ?? row.olid ?? row.openlibrary_id
  const normalizedOlid = olid?.toString().trim()
  if (normalizedOlid) {
    return `https://covers.openlibrary.org/b/olid/${encodeURIComponent(normalizedOlid)}-L.jpg`
  }

  const oclc = row.oclc ?? row.oclc_number
  const normalizedOclc = oclc?.toString().trim()
  if (normalizedOclc) {
    return `https://covers.openlibrary.org/b/oclc/${encodeURIComponent(normalizedOclc)}-L.jpg`
  }

  const lccn = row.lccn?.toString().trim()
  if (lccn) {
    return `https://covers.openlibrary.org/b/lccn/${encodeURIComponent(lccn)}-L.jpg`
  }

  const normalizedBarcode = row.barcode?.toString().trim()
  if (normalizedBarcode) {
    return `https://covers.openlibrary.org/b/id/${encodeURIComponent(normalizedBarcode)}-L.jpg`
  }

  return "https://covers.openlibrary.org/b/isbn/0000000000-L.jpg?default=true"
}

function mapBookRow(row: any): BookRecord {
  return {
    assumptionCode: row.assumption_code,
    barcode: row.barcode,
    category: row.category,
    shelfCode: row.shelf_code,
    authorCode: row.author_code ?? "",
    edition: row.edition ?? "",
    volumeNumber: row.volume_number ?? "",
    language: row.language ?? "",
    printNumber: row.print_number ?? "",
    purchaseDate: row.purchase_date ? new Date(row.purchase_date).toISOString().split("T")[0] : "",
    source: row.source ?? "",
    title: row.title,
    isbn: row.isbn ?? "",
    subject: row.subject ?? "",
    author: row.author ?? "",
    publisher: row.publisher ?? "",
    publishYear: row.publish_year ?? 0,
    pages: row.pages ?? 0,
    price: Number(row.price ?? 0),
    coverUrl: buildCoverUrl(row),
    coverOverride: row.cover_url || undefined,
    status: row.status,
    borrowedBy: row.current_student_id ?? undefined,
    borrowedStudentName: row.current_student_name ?? undefined,
    borrowedAt: row.borrowed_at ? new Date(row.borrowed_at).toISOString() : undefined,
    dueDate: row.due_date ? new Date(row.due_date).toISOString() : undefined,
  }
}

async function setBorrowLock(studentId: string, locked: boolean) {
  await execute(
    `INSERT INTO library_student_status (student_id, borrow_lock)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE borrow_lock = VALUES(borrow_lock)`,
    [studentId, locked ? 1 : 0]
  )
}

async function getBorrowLock(studentId: string): Promise<boolean> {
  const [{ borrow_lock = 0 } = {}] = await queryRows<{ borrow_lock: number }>(
    `SELECT borrow_lock FROM library_student_status WHERE student_id = ? LIMIT 1`,
    [studentId]
  )
  return Boolean(borrow_lock)
}

export async function listBooks(search?: string, page = 1, perPage = 25): Promise<{ books: BookRecord[]; total: number }> {
  const params: unknown[] = []
  let where = ""
  if (search?.trim()) {
    const term = `%${search.trim()}%`
    where =
      "WHERE assumption_code LIKE ? OR barcode LIKE ? OR title LIKE ? OR author LIKE ? OR subject LIKE ? OR category LIKE ?"
    params.push(term, term, term, term, term, term)
  }
  const [{ total = 0 } = {}] = await queryRows<{ total: number }>(
    `SELECT COUNT(*) AS total FROM library_books ${where}`,
    params
  )
  const offset = Math.max(page - 1, 0) * perPage
  const rows = await queryRows(
    `SELECT * FROM library_books ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  )
  return { books: rows.map(mapBookRow), total: Number(total) }
}

export async function addBook(input: BookInput): Promise<BookRecord> {
  const book = sanitizeBookInput(input)
  await execute(
    `INSERT INTO library_books (
       assumption_code,
       barcode,
       category,
       shelf_code,
       author_code,
       edition,
       volume_number,
       language,
       print_number,
       purchase_date,
       source,
       title,
       isbn,
       subject,
       author,
       publisher,
       publish_year,
       pages,
       price,
       cover_url
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      book.assumptionCode,
      book.barcode,
      book.category,
      book.shelfCode,
      book.authorCode,
      book.edition,
      book.volumeNumber,
      book.language,
      book.printNumber,
      book.purchaseDate || null,
      book.source,
      book.title,
      book.isbn,
      book.subject,
      book.author,
      book.publisher,
      book.publishYear,
      book.pages,
      book.price,
      book.coverUrl || null,
    ]
  )
  const rows = await queryRows(`SELECT * FROM library_books WHERE assumption_code = ? LIMIT 1`, [book.assumptionCode])
  if (!rows.length) {
    throw new Error("ไม่สามารถเพิ่มหนังสือได้")
  }
  return mapBookRow(rows[0])
}

export async function getBookByCode(code: string | undefined | null): Promise<BookRecord | null> {
  const trimmed = (code ?? "").trim()
  if (!trimmed) return null
  const padded = trimmed.length < 6 && trimmed.length > 0 ? trimmed.padStart(6, "0") : trimmed
  const unpadded = trimmed.replace(/^0+/, "") || "0"

  const rows = await queryRows(
    `SELECT * FROM library_books
      WHERE assumption_code IN (?, ?, ?)
         OR barcode IN (?, ?)
      LIMIT 1`,
    [trimmed, padded, unpadded, trimmed, padded]
  )
  if (!rows.length) return null
  return mapBookRow(rows[0])
}

export async function updateBook(input: BookInput): Promise<BookRecord> {
  const book = sanitizeBookInput(input)
  if (!book.assumptionCode) {
    throw new Error("กรุณาระบุรหัสอัสสัมของหนังสือ")
  }
  await execute(
    `UPDATE library_books
        SET barcode = ?,
            category = ?,
            shelf_code = ?,
            author_code = ?,
            edition = ?,
            volume_number = ?,
            language = ?,
            print_number = ?,
            purchase_date = ?,
            source = ?,
            title = ?,
            isbn = ?,
            subject = ?,
            author = ?,
            publisher = ?,
            publish_year = ?,
            pages = ?,
            price = ?,
            cover_url = ?
      WHERE assumption_code = ?`,
    [
      book.barcode,
      book.category,
      book.shelfCode,
      book.authorCode,
      book.edition,
      book.volumeNumber,
      book.language,
      book.printNumber,
      book.purchaseDate || null,
      book.source,
      book.title,
      book.isbn,
      book.subject,
      book.author,
      book.publisher,
      book.publishYear,
      book.pages,
      book.price,
      book.coverUrl || null,
      book.assumptionCode,
    ]
  )
  const rows = await queryRows(`SELECT * FROM library_books WHERE assumption_code = ? LIMIT 1`, [book.assumptionCode])
  if (!rows.length) {
    throw new Error("ไม่พบหนังสือที่ต้องการแก้ไข")
  }
  return mapBookRow(rows[0])
}

export async function deleteBook(assumptionCode: string): Promise<void> {
  const trimmed = assumptionCode?.toString().trim()
  if (!trimmed) {
    throw new Error("กรุณาระบุรหัสหนังสือ")
  }
  await execute(`DELETE FROM library_books WHERE assumption_code = ?`, [trimmed])
}

export async function importBooks(inputs: BookInput[]): Promise<{ processed: number }> {
  const valid: BookInput[] = []
  for (const raw of inputs) {
    const book = sanitizeBookInput(raw)
    if (!book.assumptionCode || !book.title) {
      continue
    }
    valid.push({
      ...book,
      barcode: book.barcode || book.assumptionCode,
      category: book.category || "ทั่วไป",
      shelfCode: book.shelfCode || "GEN",
      authorCode: book.authorCode || book.assumptionCode,
    })
  }
  if (!valid.length) {
    return { processed: 0 }
  }
  const chunkSize = 200
  let processed = 0
  for (let index = 0; index < valid.length; index += chunkSize) {
    const chunk = valid.slice(index, index + chunkSize)
    const placeholders = chunk.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')").join(",")
    const values = chunk.flatMap((book) => [
      book.assumptionCode,
      book.barcode,
      book.category,
      book.shelfCode,
      book.authorCode,
      book.edition,
      book.volumeNumber,
      book.language,
      book.printNumber,
      book.purchaseDate || null,
      book.source,
      book.title,
      book.isbn,
      book.subject,
      book.author,
      book.publisher,
      book.publishYear,
      book.pages,
      book.price,
      book.coverUrl || null,
    ])
    await execute(
      `INSERT INTO library_books (
         assumption_code,
         barcode,
         category,
         shelf_code,
         author_code,
         edition,
         volume_number,
         language,
         print_number,
         purchase_date,
         source,
         title,
         isbn,
         subject,
         author,
         publisher,
         publish_year,
         pages,
         price,
         cover_url,
         status
       )
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE
         barcode = VALUES(barcode),
         category = VALUES(category),
         shelf_code = VALUES(shelf_code),
         author_code = VALUES(author_code),
         edition = VALUES(edition),
         volume_number = VALUES(volume_number),
         language = VALUES(language),
         print_number = VALUES(print_number),
         purchase_date = VALUES(purchase_date),
         source = VALUES(source),
         title = VALUES(title),
         isbn = VALUES(isbn),
         subject = VALUES(subject),
         author = VALUES(author),
         publisher = VALUES(publisher),
         publish_year = VALUES(publish_year),
         pages = VALUES(pages),
         price = VALUES(price),
         cover_url = VALUES(cover_url)`
      , values
    )
    processed += chunk.length
  }
  return { processed }
}

export async function listBookCodes(): Promise<string[]> {
  const rows = await queryRows<{ assumption_code: string }>(`SELECT assumption_code FROM library_books`)
  return rows.map((row) => row.assumption_code)
}

export async function deleteBooksByCodes(codes: string[]): Promise<void> {
  if (!codes.length) return
  const placeholders = codes.map(() => "?").join(",")
  await execute(`DELETE FROM library_books WHERE assumption_code IN (${placeholders})`, codes)
}

export async function borrowBook(studentId: string, code: string) {
  const trimmedStudent = studentId.trim()
  const trimmedCode = code.trim()
  if (!trimmedStudent || !trimmedCode) {
    throw new Error("ข้อมูลไม่ครบ")
  }
  const studentRecord = await getStudentByCode(trimmedStudent)
  if (!studentRecord) {
    throw new Error("ไม่พบนักเรียนในระบบ")
  }
  const student = {
    student_id: studentRecord.studentCode,
    full_name: `${studentRecord.title ? `${studentRecord.title} ` : ""}${studentRecord.firstName} ${studentRecord.lastName}`,
  }

  const borrowLock = await getBorrowLock(student.student_id)
  if (borrowLock) {
    throw new Error("นักเรียนคนนี้ยืมครบจำนวนแล้ว กรุณาคืนหนังสือทั้งหมดก่อนทำรายการใหม่")
  }

  const [{ active = 0 } = {}] = await queryRows<{ active: number }>(
    `SELECT COUNT(*) AS active
       FROM library_books
      WHERE current_student_id = ?
        AND status = 'borrowed'`,
    [student.student_id]
  )
  if (Number(active) >= 2) {
    throw new Error("นักเรียน 1 คนสามารถยืมได้สูงสุด 2 เล่มพร้อมกัน กรุณาคืนเล่มก่อนหน้า")
  }

  const book = await getBookByCode(trimmedCode)
  if (!book) {
    throw new Error("ไม่พบหนังสือ")
  }
  if (book.status === "borrowed") {
    throw new Error(`เล่มนี้ถูกยืมโดย ${book.borrowedStudentName || book.borrowedBy}`)
  }
  await execute(
    `UPDATE library_books
       SET status = 'borrowed',
           current_student_id = ?,
           current_student_name = ?,
           borrowed_at = NOW(),
           due_date = DATE_ADD(NOW(), INTERVAL 7 DAY)
     WHERE assumption_code = ?`
    , [student.student_id, student.full_name, book.assumptionCode]
  )
  await execute(
    `INSERT INTO library_loans (book_id, student_id, student_name, assumption_code, barcode, title)
     SELECT id, ?, ?, assumption_code, barcode, title
     FROM library_books
     WHERE assumption_code = ?
     LIMIT 1`
    , [student.student_id, student.full_name, book.assumptionCode]
  )
  const updated = await getBookByCode(book.assumptionCode)

  const [{ active: activeAfter = 0 } = {}] = await queryRows<{ active: number }>(
    `SELECT COUNT(*) AS active
       FROM library_books
      WHERE current_student_id = ?
        AND status = 'borrowed'`,
    [student.student_id]
  )
  if (Number(activeAfter) >= 2) {
    await setBorrowLock(student.student_id, true)
  }

  return { book: updated }
}

export async function returnBook(studentId: string, code: string) {
  const trimmedStudent = studentId.trim()
  const trimmedCode = code.trim()
  if (!trimmedStudent || !trimmedCode) {
    throw new Error("ข้อมูลไม่ครบ")
  }
  const book = await getBookByCode(trimmedCode)
  if (!book || book.status !== "borrowed") {
    throw new Error("เล่มนี้ไม่ได้ถูกยืมอยู่")
  }
  if (book.borrowedBy !== trimmedStudent) {
    throw new Error(`เล่มนี้ถูกยืมโดย ${book.borrowedStudentName || book.borrowedBy}`)
  }
  await execute(
    `UPDATE library_books
       SET status = 'available',
           current_student_id = NULL,
           current_student_name = NULL,
           borrowed_at = NULL,
           due_date = NULL
     WHERE assumption_code = ?`
    , [book.assumptionCode]
  )
  await execute(
    `UPDATE library_loans
       SET status = 'returned', returned_at = NOW()
     WHERE student_id = ?
       AND assumption_code = ?
       AND status = 'borrowed'
     ORDER BY borrowed_at DESC
     LIMIT 1`
    , [trimmedStudent, book.assumptionCode]
  )
  const updated = await getBookByCode(book.assumptionCode)

  const [{ active: activeAfter = 0 } = {}] = await queryRows<{ active: number }>(
    `SELECT COUNT(*) AS active
       FROM library_books
      WHERE current_student_id = ?
        AND status = 'borrowed'`,
    [trimmedStudent]
  )
  if (Number(activeAfter) === 0) {
    await setBorrowLock(trimmedStudent, false)
  }

  await adjustPoints(trimmedStudent, 5, `คืนหนังสือ ${book.title}`)

  return { book: updated }
}

export async function adjustPoints(studentId: string, change: number, note: string) {
  const trimmed = studentId.trim()
  const studentRecord = await getStudentByCode(trimmed)
  if (!studentRecord) {
    throw new Error("ไม่พบนักเรียนในระบบ")
  }
  await execute(`INSERT INTO library_scores (student_id, change_value, note) VALUES (?, ?, ?)`, [trimmed, change, note])
}

export async function getStudentProfile(studentCode: string): Promise<LibraryStudentProfile | null> {
  const trimmed = studentCode.trim()
  if (!trimmed) return null
  const studentRecord = await getStudentByCode(trimmed)
  if (!studentRecord) return null
  const student = studentRecord

  const loanRows = await queryRows(
    `SELECT id,
            student_id AS studentId,
            assumption_code AS assumptionCode,
            barcode,
            title,
            borrowed_at,
            returned_at,
            status
       FROM library_loans
      WHERE student_id = ?
      ORDER BY borrowed_at DESC
      LIMIT 20`,
    [trimmed]
  )
  const loans: LoanRecord[] = loanRows.map((row) => ({
    id: row.id,
    studentId: row.studentId,
    assumptionCode: row.assumptionCode,
    barcode: row.barcode,
    title: row.title,
    borrowedAt: new Date(row.borrowed_at).toISOString(),
    returnedAt: row.returned_at ? new Date(row.returned_at).toISOString() : undefined,
    status: row.status,
  }))

  const scoreRows = await queryRows(
    `SELECT id,
            student_id AS studentId,
            change_value AS changeValue,
            note,
            created_at
       FROM library_scores
      WHERE student_id = ?
      ORDER BY created_at DESC
      LIMIT 20`,
    [trimmed]
  )
  const scoreHistory: ScoreEntry[] = scoreRows.map((row) => ({
    id: row.id,
    studentId: row.studentId,
    change: Number(row.changeValue),
    note: row.note,
    createdAt: row.created_at, // <- FIXED
  }))
  
  const [{ totalPoints = 0 } = {}] = await queryRows<{ totalPoints: number }>(
    `SELECT COALESCE(SUM(change_value), 0) AS totalPoints FROM library_scores WHERE student_id = ?`,
    [trimmed]
  )

  const requireFullReturn = await getBorrowLock(trimmed)

  return {
    student,
    loans,
    stats: {
      points: Number(totalPoints),
      activeLoans: loans.filter((loan) => loan.status === "borrowed").length,
      totalLoans: loans.length,
    },
    scoreHistory,
    restrictions: {
      requireFullReturn,
    },
  }
}
