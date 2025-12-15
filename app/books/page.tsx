"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent, useCallback } from "react"
import Link from "next/link"
import NextImage from "next/image"
import type { BookInput, BookRecord } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart3, FileDown, PlusCircle, Trash2, Upload, Pencil, ScanLine, Printer, ShieldCheck } from "lucide-react"
import { createXlsxBlob, createXlsxBlobFromRows } from "@/lib/xlsx"
import { generateRandomAssumptionCode } from "@/lib/utils/book-code"

interface BookFormState extends Omit<BookInput, "publishYear" | "pages" | "price"> {
  publishYear: string
  pages: string
  price: string
  coverUrl: string
}

const defaultForm: BookFormState = {
  assumptionCode: "",
  barcode: "",
  category: "",
  shelfCode: "",
  authorCode: "",
  edition: "1",
  volumeNumber: "",
  language: "",
  printNumber: "",
  purchaseDate: "",
  source: "",
  title: "",
  isbn: "",
  subject: "",
  author: "",
  publisher: "",
  publishYear: `${new Date().getFullYear()}`,
  pages: "200",
  price: "350",
  coverUrl: "",
}

const sampleImportPayload = JSON.stringify(
  [
    {
      assumptionCode: "A00001",
      barcode: "8851234567890",
      category: "วรรณกรรม",
      shelfCode: "FIC-01",
      authorCode: "PGD001",
      edition: "1",
      title: "ตัวอย่างการใช้งานระบบ",
      isbn: "9786160000000",
      subject: "การจัดการห้องสมุด",
      author: "คณะผู้จัดทำ",
      publisher: "ACR",
      publishYear: new Date().getFullYear(),
      pages: 220,
      price: 320,
      coverUrl: "",
    },
  ],
  null,
  2
)

const sourceOptions = [
  { value: "ซื้อ", label: "ซื้อ (งบประมาณ/จัดซื้อ)" },
  { value: "บริจาค", label: "บริจาค" },
  { value: "แถม", label: "แถมหรือสนับสนุนโครงการ" },
  { value: "อื่นๆ", label: "อื่นๆ" },
]

const categoryOptions = [
  { value: "วิทยาการคอมพิวเตอร์ สารสนเทศ และงานทั่วไป", label: "000 · วิทยาการคอมพิวเตอร์ สารสนเทศ และงานทั่วไป" },
  { value: "ปรัชญาและจิตวิทยา", label: "100 · ปรัชญาและจิตวิทยา" },
  { value: "ศาสนา", label: "200 · ศาสนา" },
  { value: "สังคมศาสตร์", label: "300 · สังคมศาสตร์" },
  { value: "ภาษา", label: "400 · ภาษา" },
  { value: "วิทยาศาสตร์", label: "500 · วิทยาศาสตร์" },
  { value: "เทคโนโลยี (หรือวิทยาศาสตร์ประยุกต์)", label: "600 · เทคโนโลยี (หรือวิทยาศาสตร์ประยุกต์)" },
  { value: "ศิลปะและนันทนาการ", label: "700 · ศิลปะและนันทนาการ" },
  { value: "วรรณกรรม", label: "800 · วรรณกรรม" },
  { value: "ประวัติศาสตร์และภูมิศาสตร์", label: "900 · ประวัติศาสตร์และภูมิศาสตร์" },
  { value: "น.นวนิยาย", label: "น.นวนิยาย" },
  { value: "น.นิทาน", label: "น.นิทาน" },
  { value: "รส.เรื่องสั้น", label: "รส.เรื่องสั้น" },
  { value: "ส.สารคดี", label: "ส.สารคดี" },
  { value: "ก.การศึกษา", label: "ก.การศึกษา" },
  { value: "ย.เยาวชน", label: "ย.เยาวชน" },
  { value: "ค.คู่มือ", label: "ค.คู่มือ" },
]

const printableFields: Array<{ label: string; detail?: string }> = [
  { label: "เลขทะเบียนหนังสือ (Assumption Code)" },
  { label: "บาร์โค้ด" },
  { label: "ชื่อหนังสือ" },
  { label: "ผู้แต่ง" },
  { label: "หมวดหมู่ (Dewey)" },
  { label: "หมู่หนังสือ / เลขเรียกหนังสือ" },
  { label: "หัวเรื่อง" },
  { label: "ฉบับที่ / เล่มที่ / ภาษา" },
  { label: "พิมพ์ครั้งที่ / ปีที่พิมพ์ / จำนวนหน้า" },
  { label: "ราคา / วันที่ซื้อ / แหล่งที่มา" },
  { label: "ISBN / สำนักพิมพ์" },
]

interface MonthlyReportPayload {
  period: {
    year: number
    month: number
    start: string
    end: string
  }
  transactions: Array<{
    assumptionCode: string
    title: string
    studentName: string
    classLevel: string
    category: string
    borrowedAt: string | null
    returnedAt: string | null
  }>
  classStats: Array<{ classLevel: string; total: number }>
  categoryStats: Array<{ category: string; total: number }>
}

function extractSubjectLines(subject: string | undefined): string[] {
  const cleaned = subject
    ? subject
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(/^\d+\.\s*/, ""))
    : []
  while (cleaned.length < 2) {
    cleaned.push("")
  }
  return cleaned
}

function formatSubjectLines(lines: string[]): string {
  return lines
    .map((line, index) => (line.trim() ? `${index + 1}. ${line.trim()}` : ""))
    .filter(Boolean)
    .join("\n")
}

function getPreviewCover(form: BookFormState): string {
  if (form.coverUrl?.trim()) {
    return form.coverUrl.trim()
  }
  const isbn = form.isbn?.replace(/[^0-9Xx]/g, "").trim()
  if (isbn) {
    return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  }
  if (form.barcode?.trim()) {
    return `https://covers.openlibrary.org/b/id/${encodeURIComponent(form.barcode.trim())}-L.jpg`
  }
  return "https://covers.openlibrary.org/b/isbn/0000000000-L.jpg?default=true"
}

function mapRecordToForm(book: BookRecord): BookFormState {
  return {
    assumptionCode: book.assumptionCode,
    barcode: book.barcode || "",
    category: book.category || "",
    shelfCode: book.shelfCode || "",
    authorCode: book.authorCode || "",
    edition: book.edition || "",
    volumeNumber: book.volumeNumber || "",
    language: book.language || "",
    printNumber: book.printNumber || "",
    purchaseDate: book.purchaseDate || "",
    source: book.source || "",
    title: book.title || "",
    isbn: book.isbn || "",
    subject: book.subject || "",
    author: book.author || "",
    publisher: book.publisher || "",
    publishYear: book.publishYear ? String(book.publishYear) : `${new Date().getFullYear()}`,
    pages: book.pages ? String(book.pages) : "0",
    price: book.price ? String(book.price) : "0",
    coverUrl: book.coverOverride || "",
  }
}

export default function BooksPage() {
  const [books, setBooks] = useState<BookRecord[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [form, setForm] = useState<BookFormState>(defaultForm)
  const [formError, setFormError] = useState("")
  const previewCover = useMemo(() => getPreviewCover(form), [form])
  const importFileRef = useRef<HTMLInputElement | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importPayload, setImportPayload] = useState(sampleImportPayload)
  const [importStatus, setImportStatus] = useState("")
  const [importError, setImportError] = useState("")
  const [importing, setImporting] = useState(false)
  const [importWarning, setImportWarning] = useState<{
    message: string
    missingCount: number
    sampleCodes: string[]
  } | null>(null)
  const [pendingImportPayload, setPendingImportPayload] = useState("")
  const [importFile, setImportFile] = useState<File | null>(null)
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null)
  const [page, setPage] = useState(1)
  const [perPage] = useState(25)
  const [totalBooks, setTotalBooks] = useState(0)
  const [barcodePreviewBook, setBarcodePreviewBook] = useState<BookRecord | null>(null)
  const [barcodeMode, setBarcodeMode] = useState<"assumption" | "library">("assumption")
  const [subjectLines, setSubjectLines] = useState<string[]>(() => extractSubjectLines(defaultForm.subject))
  const [exporting, setExporting] = useState(false)
  const [coverUploadStatus, setCoverUploadStatus] = useState("")
  const [assumptionCodeValidation, setAssumptionCodeValidation] = useState<{
    status: "idle" | "checking" | "available" | "taken" | "error"
    message: string
    code?: string
  }>({
    status: "idle",
    message: "",
    code: undefined,
  })
  const [assumptionCodeMode, setAssumptionCodeMode] = useState<"manual" | "auto">("manual")
  const [randomizingCode, setRandomizingCode] = useState(false)
  const [assumptionCodeAudit, setAssumptionCodeAudit] = useState<{
    type: "info" | "success" | "error"
    message: string
    duplicates?: Array<{ code: string; total: number; titles: string[] }>
  } | null>(null)
  const [validatingAssumptionCodes, setValidatingAssumptionCodes] = useState(false)
  const defaultMonthlyValue = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  }, [])
  const [monthlyReportDialogOpen, setMonthlyReportDialogOpen] = useState(false)
  const [monthlyReportMonth, setMonthlyReportMonth] = useState(defaultMonthlyValue)
  const [monthlyReportError, setMonthlyReportError] = useState("")
  const [downloadingMonthlyReport, setDownloadingMonthlyReport] = useState(false)
  const resetAssumptionCodeValidation = useCallback(() => {
    setAssumptionCodeValidation({ status: "idle", message: "", code: undefined })
  }, [])
  const validateAssumptionCode = useCallback(
    async (
      codeOverride?: string
    ): Promise<{ available: boolean; message: string; code?: string }> => {
      if (dialogMode === "edit") {
        return { available: true, message: "", code: form.assumptionCode }
      }
      const code = (codeOverride ?? form.assumptionCode).trim()
      if (!code) {
        const message = "กรุณากรอกรหัสอัสสัมก่อนตรวจสอบ"
        setAssumptionCodeValidation({ status: "error", message, code: undefined })
        return { available: false, message }
      }
      setAssumptionCodeValidation({ status: "checking", message: "", code })
      try {
        const response = await fetch(`/api/library/books/${encodeURIComponent(code)}`)
        if (response.status === 404) {
          const message = `รหัส ${code} พร้อมใช้งาน`
          setAssumptionCodeValidation({ status: "available", message, code })
          return { available: true, message, code }
        }
        if (response.ok) {
          const existing = await response.json().catch(() => ({}))
          const message = `รหัส ${code} ถูกใช้งานแล้ว${existing.title ? ` (${existing.title})` : ""}`
          setAssumptionCodeValidation({
            status: "taken",
            message,
            code,
          })
          return { available: false, message, code }
        }
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || "ตรวจสอบรหัสไม่สำเร็จ")
      } catch (error) {
        const message = (error as Error).message || "ตรวจสอบรหัสไม่สำเร็จ"
        setAssumptionCodeValidation({
          status: "error",
          message,
          code,
        })
        return { available: false, message, code }
      }
    },
    [dialogMode, form.assumptionCode]
  )
  const findAvailableAssumptionCode = useCallback(async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = generateRandomAssumptionCode()
      const result = await validateAssumptionCode(candidate)
      if (result.available) {
        return candidate
      }
    }
    throw new Error("ไม่พบรหัสอัสสัมที่ว่าง กรุณากรอกเอง")
  }, [validateAssumptionCode])
  const handleRandomizeAssumptionCode = useCallback(async () => {
    if (dialogMode === "edit") return
    setRandomizingCode(true)
    setFormError("")
    try {
      const candidate = await findAvailableAssumptionCode()
      setForm((prev) => ({ ...prev, assumptionCode: candidate }))
    } catch (error) {
      const message = (error as Error).message || "ไม่พบรหัสอัสสัมที่ว่าง กรุณากรอกเอง"
      setFormError(message)
      setAssumptionCodeValidation({
        status: "error",
        message,
        code: undefined,
      })
    } finally {
      setRandomizingCode(false)
    }
  }, [dialogMode, findAvailableAssumptionCode])
  const handleAssumptionCodeModeChange = useCallback(
    async (mode: "manual" | "auto") => {
      if (dialogMode === "edit") return
      if (mode === assumptionCodeMode) return
      setAssumptionCodeMode(mode)
      if (mode === "auto") {
        await handleRandomizeAssumptionCode()
      } else {
        resetAssumptionCodeValidation()
      }
    },
    [assumptionCodeMode, dialogMode, handleRandomizeAssumptionCode, resetAssumptionCodeValidation]
  )
  const barcodePreviewUrl = useMemo(() => {
    if (!barcodePreviewBook) return ""
    const code =
      barcodeMode === "assumption"
        ? barcodePreviewBook.assumptionCode?.trim() || "000000"
        : `${barcodePreviewBook.shelfCode || ""} ${barcodePreviewBook.authorCode || ""} ${barcodePreviewBook.edition || ""}`
            .trim() || "รหัสไม่ครบ"
    return `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(code)}&scale=3&background=ffffff`
  }, [barcodePreviewBook, barcodeMode])
  const barcodeCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const coverFileRef = useRef<HTMLInputElement | null>(null)
  const [barcodeImageData, setBarcodeImageData] = useState("")
  useEffect(() => {
    if (!barcodePreviewBook) {
      setBarcodeImageData("")
      return
    }
    const timer = setTimeout(() => {
      const canvas = barcodeCanvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const width = 420
      const height = 260
      canvas.width = width
      canvas.height = height

      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, width, height)

      ctx.fillStyle = "#0f172a"
      ctx.font = "600 16px 'Sarabun', 'Noto Sans Thai', sans-serif"
      ctx.textAlign = "center"
      
      if (barcodeMode === "library") {
        ctx.font = "30px 'Sarabun', 'Noto Sans Thai', sans-serif"
        ctx.fillText(`${barcodePreviewBook.shelfCode || "-"}`, width / 2, 90)
        ctx.fillText(`${barcodePreviewBook.authorCode || "-"}`, width / 2, 130)
        ctx.fillText(` ฉ.${barcodePreviewBook.edition || "-"}`, width / 2, 170)
        setBarcodeImageData(canvas.toDataURL("image/png"))
        return
      }

      if (!barcodePreviewUrl) {
        setBarcodeImageData("")
        return
      }

      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        ctx.fillText(barcodePreviewBook.shelfCode+"/"+barcodePreviewBook.title || "ชื่อหนังสือ", width / 2, 35)

        const barcodeWidth = Math.min(360, img.width)
        const barcodeHeight = 60
        const offsetX = (width - barcodeWidth) / 2
        ctx.drawImage(img, offsetX, 55, barcodeWidth, barcodeHeight)
        ctx.strokeStyle = "#e2e8f0"
        ctx.strokeRect(offsetX, 55, barcodeWidth, barcodeHeight)

        ctx.fillStyle = "#0f172a"
        ctx.font = "20px 'Courier New', monospace"
        ctx.textAlign = "left"
        ctx.fillText(barcodePreviewBook.authorCode || "", 105, 140)
        ctx.textAlign = "right"
        ctx.fillText(barcodePreviewBook.assumptionCode || "000000", width - 105, 140)
        setBarcodeImageData(canvas.toDataURL("image/png"))
      }
      img.onerror = () => setBarcodeImageData("")
      img.src = barcodePreviewUrl
    }, 80)
    return () => clearTimeout(timer)
  }, [barcodePreviewBook, barcodePreviewUrl, barcodeMode])
  


  const filteredBooks = useMemo(() => {
    if (!search.trim()) return books
    const term = search.trim().toLowerCase()
    return books.filter((book) =>
      [book.assumptionCode, book.barcode, book.title, book.author, book.category]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term))
    )
  }, [books, search])

  const handleEditBook = useCallback(
    (book: BookRecord) => {
      setDialogMode("edit")
      setAssumptionCodeMode("manual")
      setForm(mapRecordToForm(book))
      setSubjectLines(extractSubjectLines(book.subject))
      setFormError("")
      resetAssumptionCodeValidation()
      setDialogOpen(true)
    },
    [resetAssumptionCodeValidation]
  )

  const handleDeleteBook = useCallback(async (book: BookRecord) => {
    if (!confirm(`ต้องการลบ ${book.title} (${book.assumptionCode}) ใช่หรือไม่?`)) return
    try {
      const response = await fetch("/api/library/books", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assumptionCode: book.assumptionCode }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || "ไม่สามารถลบหนังสือได้")
      }
      setBooks((prev) => prev.filter((item) => item.assumptionCode !== book.assumptionCode))
    } catch (err) {
      setError((err as Error).message || "ไม่สามารถลบหนังสือได้")
    }
  }, [])

  const tableRows = useMemo(
    () =>
      filteredBooks.map((book) => (
        <TableRow key={book.assumptionCode}>
          <TableCell>
            <div className="relative h-20 w-14 overflow-hidden rounded-md bg-slate-100">
              <NextImage src={book.coverUrl} alt={book.title} fill className="object-cover" sizes="80px" />
            </div>
          </TableCell>
          <TableCell>
            <p className="font-semibold text-slate-900">{book.assumptionCode}</p>
            <p className="text-sm text-slate-600">{book.title}</p>
            <p className="text-xs text-slate-400">บาร์โค้ด: {book.barcode}</p>
          </TableCell>
          <TableCell className="text-sm text-slate-900">{book.category}</TableCell>
       
          <TableCell>
            <Badge variant={book.status === "available" ? "outline" : "default"}>
              {book.status === "available" ? "พร้อมยืม" : "กำลังยืม"}
            </Badge>
          </TableCell>
          <TableCell className="text-sm text-slate-500">{book.borrowedStudentName || book.borrowedBy || "-"}</TableCell>
          <TableCell>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setBarcodePreviewBook(book)} title="ดูบาร์โค้ด">
                <ScanLine className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleEditBook(book)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => handleDeleteBook(book)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )),
    [filteredBooks, handleEditBook, handleDeleteBook]
  )

  const loadBooks = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("q", search.trim())
      params.set("page", String(page))
      params.set("perPage", String(perPage))
      const response = await fetch(`/api/library/books?${params.toString()}`)
      const payload = await response.json().catch(() => ({ books: [] }))
      if (!response.ok) {
        throw new Error(payload.error || "ไม่สามารถโหลดรายชื่อหนังสือได้")
      }
      setBooks(payload.books || [])
      setTotalBooks(payload.total || 0)
    } catch (err) {
      setError((err as Error).message || "ไม่สามารถโหลดรายชื่อหนังสือได้")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBooks()
  }, [page, perPage, search])

  useEffect(() => {
    setPage(1)
  }, [search])

  const fetchAllBooks = useCallback(async (): Promise<BookRecord[]> => {
    const aggregated: BookRecord[] = []
    let currentPage = 1
    const chunkSize = 250
    let total = Infinity
    while (aggregated.length < total) {
      const params = new URLSearchParams()
      params.set("page", String(currentPage))
      params.set("perPage", String(chunkSize))
      const response = await fetch(`/api/library/books?${params.toString()}`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || "ไม่สามารถโหลดข้อมูลทั้งหมดสำหรับส่งออกได้")
      }
      const pageBooks: BookRecord[] = payload.books || []
      total = Number(payload.total || pageBooks.length)
      aggregated.push(...pageBooks)
      if (!pageBooks.length || aggregated.length >= total) {
        break
      }
      currentPage += 1
      if (currentPage > 5000) {
        break
      }
    }
    return aggregated
  }, [])
  const handleValidateAllAssumptionCodes = useCallback(async () => {
    setValidatingAssumptionCodes(true)
    setAssumptionCodeAudit({ type: "info", message: "กำลังตรวจสอบรหัสอัสสัมทั้งหมด..." })
    try {
      const allBooks = await fetchAllBooks()
      if (!allBooks.length) {
        setAssumptionCodeAudit({ type: "error", message: "ไม่มีข้อมูลหนังสือให้ตรวจสอบ" })
        return
      }
      const duplicateMap = new Map<string, BookRecord[]>()
      for (const book of allBooks) {
        const code = book.assumptionCode?.trim()
        if (!code) continue
        const list = duplicateMap.get(code) ?? []
        list.push(book)
        duplicateMap.set(code, list)
      }
      const duplicates = Array.from(duplicateMap.entries())
        .filter(([, list]) => list.length > 1)
        .map(([code, list]) => ({
          code,
          total: list.length,
          titles: list.map((item) => item.title).filter(Boolean).slice(0, 3),
        }))
      if (!duplicates.length) {
        setAssumptionCodeAudit({ type: "success", message: "ไม่พบรหัสอัสสัมซ้ำในฐานข้อมูล" })
      } else {
        setAssumptionCodeAudit({
          type: "error",
          message: `พบรหัสอัสสัมซ้ำ ${duplicates.length} รหัส กรุณาตรวจสอบ`,
          duplicates,
        })
      }
    } catch (error) {
      setAssumptionCodeAudit({
        type: "error",
        message: (error as Error).message || "ตรวจสอบรหัสอัสสัมทั้งหมดไม่สำเร็จ",
      })
    } finally {
      setValidatingAssumptionCodes(false)
    }
  }, [fetchAllBooks])

  const handleDownloadMonthlyReport = useCallback(async () => {
    if (!monthlyReportMonth) {
      setMonthlyReportError("กรุณาเลือกเดือน")
      return
    }
    setDownloadingMonthlyReport(true)
    setMonthlyReportError("")
    try {
      const response = await fetch(`/api/library/reports/monthly?month=${monthlyReportMonth}`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || "ไม่สามารถสร้างรายงานได้")
      }
      const rows = buildMonthlyReportRows(payload as MonthlyReportPayload)
      const blob = createXlsxBlobFromRows(rows)
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `library-monthly-report-${monthlyReportMonth}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setMonthlyReportDialogOpen(false)
    } catch (error) {
      setMonthlyReportError((error as Error).message || "ไม่สามารถสร้างรายงานได้")
    } finally {
      setDownloadingMonthlyReport(false)
    }
  }, [monthlyReportMonth])

  const buildPayload = (): BookInput => {
    const currentYear = new Date().getFullYear()
    const normalizedSubject = formatSubjectLines(subjectLines)
    return {
      assumptionCode: form.assumptionCode.trim(),
      barcode: form.barcode.trim(),
      category: form.category.trim(),
      shelfCode: form.shelfCode.trim(),
      authorCode: form.authorCode.trim(),
      edition: form.edition.trim(),
      volumeNumber: form.volumeNumber.trim(),
      language: form.language.trim(),
      printNumber: form.printNumber.trim(),
      purchaseDate: form.purchaseDate.trim(),
      source: form.source.trim(),
      title: form.title.trim(),
      isbn: form.isbn.trim(),
      subject: normalizedSubject,
      author: form.author.trim(),
      publisher: form.publisher.trim(),
      publishYear: Number(form.publishYear) || currentYear,
      pages: Number(form.pages) || 0,
      price: Number(form.price) || 0,
      coverUrl: form.coverUrl.trim(),
    }
  }

  const handleSubmitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError("")
    try {
      if (dialogMode === "create") {
        const trimmedCode = form.assumptionCode.trim()
        const alreadyValidated =
          trimmedCode &&
          assumptionCodeValidation.code === trimmedCode &&
          assumptionCodeValidation.status === "available"
        if (!alreadyValidated) {
          const result = await validateAssumptionCode(trimmedCode)
          if (!result.available) {
            setFormError(result.message || `รหัส ${trimmedCode} ถูกใช้งานแล้ว`)
            return
          }
        }
      }
      const payload = buildPayload()
      const method = dialogMode === "create" ? "POST" : "PUT"
      const response = await fetch("/api/library/books", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถบันทึกหนังสือได้")
      }
      if (dialogMode === "create") {
        setBooks((prev) => [data, ...prev])
      } else {
        setBooks((prev) => prev.map((book) => (book.assumptionCode === data.assumptionCode ? data : book)))
      }
      setDialogOpen(false)
      setForm(defaultForm)
      setSubjectLines(extractSubjectLines(defaultForm.subject))
      setDialogMode("create")
      setAssumptionCodeMode("manual")
      resetAssumptionCodeValidation()
      setCoverUploadStatus("")
      if (coverFileRef.current) {
        coverFileRef.current.value = ""
      }
    } catch (err) {
      setFormError((err as Error).message || "ไม่สามารถบันทึกหนังสือได้")
    }
  }

  const handleCoverFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setCoverUploadStatus("กำลังอัปโหลด...")
    try {
      const formData = new FormData()
      formData.append("cover", file)
      const response = await fetch("/api/library/books/cover", {
        method: "POST",
        body: formData,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || "อัปโหลดรูปไม่สำเร็จ")
      }
      setForm((prev) => ({ ...prev, coverUrl: data.url || data.coverUrl || "" }))
      setCoverUploadStatus("บันทึกรูปแล้ว")
    } catch (error) {
      setCoverUploadStatus((error as Error).message || "อัปโหลดรูปไม่สำเร็จ")
    }
  }

  const handleExportExcel = async () => {
    if (exporting) return
    setError("")
    setExporting(true)
    try {
      const allBooks = await fetchAllBooks()
      if (!allBooks.length) {
        throw new Error("ไม่มีข้อมูลหนังสือสำหรับส่งออก")
      }
      const header = [
        "รหัสอัสสัม",
        "บาร์โค้ด",
        "ชื่อหนังสือ",
        "ผู้แต่ง",
        "หมวดหมู่",
        "หมู่หนังสือ",
        "เลขเรียกหนังสือ",
        "ฉบับที่",
        "เล่มที่",
        "ภาษา",
        "พิมพ์ครั้งที่",
        "ปีที่พิมพ์",
        "จำนวนหน้า",
        "ราคา (บาท)",
        "วันที่ซื้อ",
        "แหล่งที่มา",
        "หัวเรื่อง",
        "ISBN",
        "สำนักพิมพ์",
        "สถานะ",
        "ผู้ยืมปัจจุบัน",
        "ยืมเมื่อ",
        "กำหนดคืน",
      ]
      const formatDate = (value?: string) => {
        if (!value) return ""
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) {
          return value
        }
        return date.toLocaleDateString("th-TH")
      }
      const formatDateTime = (value?: string) => {
        if (!value) return ""
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) {
          return value
        }
        return date.toLocaleString("th-TH")
      }
      const rows = allBooks.map((book) => [
        book.assumptionCode,
        book.barcode || "",
        book.title || "",
        book.author || "",
        book.category || "",
        book.shelfCode || "",
        book.authorCode || "",
        book.edition || "",
        book.volumeNumber || "",
        book.language || "",
        book.printNumber || "",
        book.publishYear?.toString() || "",
        book.pages?.toString() || "",
        book.price?.toString() || "",
        formatDate(book.purchaseDate),
        book.source || "",
        book.subject || "",
        book.isbn || "",
        book.publisher || "",
        book.status === "borrowed" ? "กำลังยืม" : "พร้อมยืม",
        book.borrowedStudentName || book.borrowedBy || "",
        formatDateTime(book.borrowedAt),
        formatDateTime(book.dueDate),
      ])
      const blob = createXlsxBlob(header, rows)
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `library_books_${new Date().toISOString().slice(0, 10)}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError((err as Error).message || "ไม่สามารถส่งออกไฟล์ได้")
    } finally {
      setExporting(false)
    }
  }

  const handleSubjectLineChange = (index: number, value: string) => {
    setSubjectLines((prev) => {
      const next = [...prev]
      next[index] = value
      setForm((prevForm) => ({ ...prevForm, subject: formatSubjectLines(next) }))
      return next
    })
  }

  const handleAddSubjectLine = () => {
    setSubjectLines((prev) => {
      const next = [...prev, ""]
      setForm((prevForm) => ({ ...prevForm, subject: formatSubjectLines(next) }))
      return next
    })
  }

  const handlePrintBlankForm = () => {
    if (typeof window === "undefined") return
    const printWindow = window.open("", "_blank", "width=900,height=1200")
    if (!printWindow) return
    const printedAt = new Date().toLocaleString("th-TH", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    })
    const fieldRows = printableFields
      .map(
        (field) => `
        <div class="field-card">
          <p class="field-label">${field.label}</p>
          <div class="field-line"></div>
        </div>`
      )
      .join("")
    const categoriesList = categoryOptions
      .map(
        (option) => `
          <label class="checkbox-item">
            <span class="box"></span>
            <span>${option.label}</span>
          </label>`
      )
      .join("")
    const sourcesList = sourceOptions
      .map(
        (option) => `
        <label class="checkbox-item">
          <span class="box"></span>
          <span>${option.label}</span>
        </label>`
      )
      .join("")
    const formMarkup = (copyNumber: number) => `
      <div class="form-wrapper">
        <div class="form-header">
          <div>
            <h1>แบบฟอร์มบันทึกหนังสือเข้าระบบ</h1>
            <p class="meta">Assumption College Rayong • สำเนา ${copyNumber}</p>
          </div>
          <div class="meta">
            <p>พิมพ์เมื่อ ${printedAt}</p>
          </div>
        </div>
        <div class="form-grid">
          ${fieldRows}
        </div>
        <div class="grid-wrapper">
          <div class="section">
            <h2>หมวดหมู่ (Dewey) — ทำเครื่องหมาย</h2>
            <div class="checkbox-grid">
              ${categoriesList}
            </div>
          </div>
          <div class="section">
            <h2>แหล่งที่มาที่ใช้บ่อย</h2>
            <div class="checkbox-grid">
              ${sourcesList}
            </div>
            <div class="topics">
              <h2>หัวเรื่อง (Topic)</h2>
              <p>1.</p>
              <p>2.</p>
              <p>3.</p>
            </div>
          </div>
        </div>
        <p class="notes">หมายเหตุ: โปรดเขียนข้อมูลด้วยปากกาหมึกดำ/น้ำเงิน และตรวจสอบความถูกต้องก่อนบันทึกลงระบบ</p>
      </div>`

    printWindow.document.write(`<!DOCTYPE html>
      <html lang="th">
        <head>
          <meta charset="utf-8" />
          <title>แบบฟอร์มเพิ่มหนังสือ</title>
          <style>
            @page { size: A4 landscape; margin: 4mm; }
            body { font-family: "Sarabun","Noto Sans Thai", sans-serif; padding: 4mm; color: #0f172a; background: #f8fafc; }
            h1 { font-size: 18px; margin-bottom: 0; }
            h2 { font-size: 12px; margin: 8px 0 4px; }
            p { margin: 1px 0; }
            .meta { font-size: 9px; color: #475569; margin-bottom: 6px; text-align: right; }
            .form-wrapper { border: 1px solid #d3def5; border-radius: 14px; background: #fff; padding: 8px 9px; margin-bottom: 6px; }
            .form-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
            .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 5px 8px; margin-bottom: 6px; }
            .field-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 5px 6px; min-height: 38px; display: flex; flex-direction: column; gap: 2px; }
            .field-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #2563eb; margin: 0; }
            .field-line { flex: 1; border-bottom: 1px dashed #bac6d8; }
            .section { margin-top: 2px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 9px; }
            .checkbox-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 2px 6px; font-size: 10px; }
            .checkbox-item { display: flex; align-items: center; gap: 3px; line-height: 1.15; }
            .checkbox-item .box { width: 8px; height: 8px; border: 1px solid #475569; border-radius: 2px; display: inline-block; }
            .notes { font-size: 9px; color: #475569; margin-top: 4px; }
            .grid-wrapper { display: grid; grid-template-columns: 5fr 4fr; gap: 6px; }
            .topics p { margin-top: 3px; padding-bottom: 1px; border-bottom: 1px dashed #94a3b8; min-height: 12px; }
          </style>
        </head>
        <body>
          ${formMarkup(1)}
          ${formMarkup(2)}
        </body>
      </html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const runImport = async (payloadText?: string, action?: "update" | "delete", fileOverride?: File | null) => {
    setImporting(true)
    setImportError("")
    setImportStatus("")
    try {
      const url = `/api/library/books/import${action ? `?action=${action}` : ""}`
      const fileToSend = fileOverride ?? importFile
      let response: Response
      if (fileToSend) {
        const formData = new FormData()
        formData.append("file", fileToSend)
        response = await fetch(url, {
          method: "POST",
          body: formData,
        })
      } else {
        const trimmedText = payloadText?.trim()
        if (!trimmedText) {
          throw new Error("กรุณาวางข้อมูล JSON ก่อน หรือเลือกไฟล์")
        }
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: trimmedText,
        })
      }
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (response.status === 409 && payload.warning) {
          setImportWarning({
            message: payload.warning,
            missingCount: payload.missingCount || 0,
            sampleCodes: payload.sampleCodes || [],
          })
          if (fileOverride || fileToSend) {
            setPendingImportFile(fileOverride ?? fileToSend)
            setPendingImportPayload("")
          } else {
            setPendingImportPayload(payloadText || "")
            setPendingImportFile(null)
          }
          return
        }
        throw new Error(payload.error || "นำเข้าข้อมูลไม่สำเร็จ")
      }
      const facts: string[] = []
      if (payload.uniqueRows !== undefined) {
        facts.push(`ไม่ซ้ำ ${payload.uniqueRows}`)
      }
      if (payload.duplicateCount) {
        facts.push(`ซ้ำ ${payload.duplicateCount}`)
      }
      if (payload.skippedMissing) {
        facts.push(`ข้าม ${payload.skippedMissing}`)
      }
      const postfix = facts.length ? ` (${facts.join(", ")})` : ""
      setImportStatus(`นำเข้าข้อมูล ${payload.processed || 0} รายการแล้ว${postfix}`)
      if (payload.duplicateCount) {
        setImportWarning({
          message: `มีข้อมูลซ้ำ ${payload.duplicateCount} รายการ`,
          missingCount: payload.duplicateCount,
          sampleCodes: payload.duplicateSamples || [],
        })
      } else {
        setImportWarning(null)
      }
      setPendingImportPayload("")
      setPendingImportFile(null)
      setImportFile(null)
      await loadBooks()
      setImportDialogOpen(false)
    } catch (err) {
      setImportError((err as Error).message || "นำเข้าข้อมูลไม่สำเร็จ")
    } finally {
      setImporting(false)
    }
  }

  const handleImportBooks = () => {
    if (importFile) {
      runImport(undefined, undefined, importFile)
      return
    }
    if (!importPayload.trim()) {
      setImportError("กรุณาวางข้อมูล JSON ก่อน หรือเลือกไฟล์")
      return
    }
    runImport(importPayload.trim())
  }

  const handleImportFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImportFile(file)
    setPendingImportFile(null)
    setImportPayload("")
    setImportError("")
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 bg-white px-4 py-4">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-blue-50">
              <NextImage src="/assumption-rayoung.png" alt="Assumption College Rayong" fill className="object-contain p-2" priority />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-blue-700">Assumption College Rayong</p>
              <p className="text-lg font-semibold text-slate-900">ฐานข้อมูลหนังสือ</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="link" className="text-blue-700">
                ← กลับไปหน้ายืม-คืน
              </Button>
            </Link>
            <Badge variant="outline">Book Management</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-blue-900">ค้นหาและเพิ่มหนังสือ | จำนวนหนังสือทั้งหมด: {totalBooks} เล่ม</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="h-10" onClick={() => setImportDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> นำเข้า JSON
              </Button>
              <Button variant="outline" className="h-10" onClick={handleExportExcel} disabled={exporting}>
                <FileDown className="mr-2 h-4 w-4" />
                {exporting ? "กำลังส่งออก..." : "ส่งออก Excel"}
              </Button>
              <Button
                variant="outline"
                className="h-10"
                onClick={() => {
                  setMonthlyReportMonth(defaultMonthlyValue)
                  setMonthlyReportError("")
                  setMonthlyReportDialogOpen(true)
                }}
              >
                <BarChart3 className="mr-2 h-4 w-4" /> ส่งออกสถิติรายเดือน
              </Button>
              <Button variant="outline" className="h-10" onClick={handlePrintBlankForm}>
                <Printer className="mr-2 h-4 w-4" /> พิมพ์แบบฟอร์มเพิ่มหนังสือ
              </Button>
              <Button
                variant="outline"
                className="h-10"
                onClick={() => void handleValidateAllAssumptionCodes()}
                disabled={validatingAssumptionCodes}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                {validatingAssumptionCodes ? "กำลังตรวจสอบรหัส..." : "ตรวจสอบรหัสทั้งหมด"}
              </Button>
              <Button
                className="h-10"
                onClick={() => {
                  setDialogMode("create")
                  setAssumptionCodeMode("manual")
                  setForm(defaultForm)
                  setSubjectLines(extractSubjectLines(defaultForm.subject))
                  setFormError("")
                  resetAssumptionCodeValidation()
                  setDialogOpen(true)
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> เพิ่มหนังสือ
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {assumptionCodeAudit && (
              <div
                className={`rounded-xl border p-3 text-sm ${
                  assumptionCodeAudit.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : assumptionCodeAudit.type === "error"
                      ? "border-red-200 bg-red-50 text-red-900"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <p>{assumptionCodeAudit.message}</p>
                {assumptionCodeAudit.duplicates?.length ? (
                  <ul className="mt-2 space-y-1 text-xs">
                    {assumptionCodeAudit.duplicates.slice(0, 3).map((duplicate) => (
                      <li key={duplicate.code}>
                        <span className="font-semibold">{duplicate.code}</span> ·{" "}
                        {duplicate.titles.join(", ") || "ไม่พบชื่อหนังสือ"}{" "}
                        {duplicate.total > duplicate.titles.length ? `(+${duplicate.total - duplicate.titles.length} เล่ม)` : ""}
                      </li>
                    ))}
                    {assumptionCodeAudit.duplicates.length > 3 && (
                      <li className="text-slate-500">
                        ...และอีก {assumptionCodeAudit.duplicates.length - 3} รหัส
                      </li>
                    )}
                  </ul>
                ) : null}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <Input
                placeholder="ค้นหาตามชื่อ/หมวด/รหัส"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11"
              />
              <div className="flex items-center gap-3">
                <p className="text-sm text-slate-500">
                  รวม {totalBooks} เล่ม • หน้า {page}/{Math.max(1, Math.ceil(totalBooks / perPage))}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={loading || page <= 1}
                  >
                    ก่อนหน้า
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() => {
                      const maxPage = Math.max(1, Math.ceil(totalBooks / perPage))
                      setPage((prev) => (prev >= maxPage ? maxPage : prev + 1))
                    }}
                    disabled={loading || page >= Math.max(1, Math.ceil(totalBooks / perPage))}
                  >
                    ถัดไป
                  </Button>
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="overflow-auto">
              {filteredBooks.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ปก</TableHead>
                      <TableHead>รหัส / ชื่อหนังสือ</TableHead>
                      <TableHead>หมวด</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>ผู้ยืม</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{tableRows}</TableBody>
                </Table>
              ) : (
                <p className="text-sm text-slate-500">ไม่พบข้อมูลหนังสือ</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "เพิ่มหนังสือเข้าระบบ" : "แก้ไขข้อมูลหนังสือ"}</DialogTitle>
            <DialogDescription>
              ใช้รหัสอัสสัม 6 หลักเพื่อป้องกันข้อมูลซ้ำ ระบบจะดึงภาพปกจาก Open Library ตาม ISBN/บาร์โค้ดโดยอัตโนมัติ
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitForm} className="space-y-4">
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex flex-col items-center gap-3 md:flex-row">
              <div className="relative h-48 w-32 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <NextImage src={previewCover} alt={form.title || "book cover"} fill className="object-cover" sizes="160px" />
              </div>
              <p className="text-sm text-slate-500">
                หากต้องการใช้ภาพอื่น ให้ใส่ URL ในช่อง "ลิงก์รูปปก" ระบบจะใช้ลิงก์นั้นแทนการดึงจาก Open Library
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <Label htmlFor="assumptionCode">เลขทะเบียนหนังสือ</Label>
                    {dialogMode === "create" ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>รูปแบบ:</span>
                        <Select
                          value={assumptionCodeMode}
                          onValueChange={(value) => void handleAssumptionCodeModeChange(value as "manual" | "auto")}
                        >
                          <SelectTrigger className="h-8 w-32 px-2 text-xs">
                            <SelectValue placeholder="เลือกโหมด" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">กำหนดเอง</SelectItem>
                            <SelectItem value="auto">สุ่ม</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Input
                        id="assumptionCode"
                        value={form.assumptionCode}
                        onChange={(event) => {
                          const value = event.target.value
                          setForm((prev) => ({ ...prev, assumptionCode: value }))
                          if (assumptionCodeMode === "manual") {
                            resetAssumptionCodeValidation()
                          }
                        }}
                        required
                        disabled={dialogMode === "edit" || assumptionCodeMode === "auto"}
                        readOnly={assumptionCodeMode === "auto"}
                        className="sm:flex-1"
                      />
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-none">
                        {assumptionCodeMode === "manual" ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setFormError("")
                              void validateAssumptionCode()
                            }}
                            disabled={
                              dialogMode === "edit" ||
                              assumptionCodeValidation.status === "checking" ||
                              !form.assumptionCode.trim()
                            }
                            className="w-full sm:w-auto"
                          >
                            {assumptionCodeValidation.status === "checking" ? "กำลังตรวจสอบ..." : "ตรวจสอบรหัส"}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void handleRandomizeAssumptionCode()}
                            disabled={randomizingCode}
                            className="w-full sm:w-auto"
                          >
                            {randomizingCode ? "กำลังสุ่ม..." : "สุ่มรหัสใหม่"}
                          </Button>
                        )}
                      </div>
                    </div>
                    {assumptionCodeValidation.message ? (
                      <p
                        className={`text-xs ${
                          assumptionCodeValidation.status === "available"
                            ? "text-emerald-600"
                            : assumptionCodeValidation.status === "checking"
                              ? "text-slate-500"
                              : "text-red-600"
                        }`}
                      >
                        {assumptionCodeValidation.message}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div>
                  <Label htmlFor="barcode">บาร์โค้ด</Label>
                  <Input
                    id="barcode"
                    value={form.barcode}
                    onChange={(event) => setForm((prev) => ({ ...prev, barcode: event.target.value }))}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="title">ชื่อหนังสือ</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="author">ผู้แต่ง</Label>
                  <Input
                    id="author"
                    value={form.author}
                    onChange={(event) => setForm((prev) => ({ ...prev, author: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">หมวดหมู่</Label>
                  <Select
                    value={form.category || "none"}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, category: value === "none" ? "" : value }))
                    }
                  >
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue placeholder="เลือกหมวดหมู่" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ไม่ระบุ</SelectItem>
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="shelfCode">หมู่หนังสือ</Label>
                  <Input
                    id="shelfCode"
                    value={form.shelfCode}
                    onChange={(event) => setForm((prev) => ({ ...prev, shelfCode: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="authorCode">เลขเรียกหนังสือ</Label>
                  <Input
                    id="authorCode"
                    value={form.authorCode}
                    onChange={(event) => setForm((prev) => ({ ...prev, authorCode: event.target.value }))}
                  />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    {subjectLines.map((line, index) => (
                      <div key={`subject-${index}`}>
                        <Label htmlFor={`subject-${index}`}>หัวเรื่อง {index + 1}</Label>
                        <Input
                          id={`subject-${index}`}
                          placeholder={`${index + 1}.`}
                          value={line}
                          onChange={(event) => handleSubjectLineChange(index, event.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddSubjectLine}>
                    + เพิ่มหัวเรื่อง
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="edition">ฉบับที่</Label>
                  <Input
                    id="edition"
                    value={form.edition}
                    onChange={(event) => setForm((prev) => ({ ...prev, edition: event.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="volumeNumber">เล่มที่</Label>
                  <Input
                    id="volumeNumber"
                    value={form.volumeNumber}
                    onChange={(event) => setForm((prev) => ({ ...prev, volumeNumber: event.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="language">ภาษา</Label>
                  <Input
                    id="language"
                    value={form.language}
                    onChange={(event) => setForm((prev) => ({ ...prev, language: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="printNumber">พิมพ์ครั้งที่</Label>
                  <Input
                    id="printNumber"
                    value={form.printNumber}
                    onChange={(event) => setForm((prev) => ({ ...prev, printNumber: event.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="publishYear">ปีที่พิมพ์</Label>
                  <Input
                    id="publishYear"
                    type="number"
                    inputMode="numeric"
                    value={form.publishYear}
                    onChange={(event) => setForm((prev) => ({ ...prev, publishYear: event.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="publisher">สำนักพิมพ์</Label>
                  <Input
                    id="publisher"
                    value={form.publisher}
                    onChange={(event) => setForm((prev) => ({ ...prev, publisher: event.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="pages">จำนวนหน้า</Label>
                  <Input
                    id="pages"
                    type="number"
                    inputMode="numeric"
                    value={form.pages}
                    onChange={(event) => setForm((prev) => ({ ...prev, pages: event.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input
                    id="isbn"
                    type="number"
                    inputMode="numeric"
                    value={form.isbn}
                    onChange={(event) => setForm((prev) => ({ ...prev, isbn: event.target.value }))}
                    required
                  />
                </div>
              </div>

              

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="price">ราคา (บาท)</Label>
                  <Input
                    id="price"
                    type="number"
                    inputMode="decimal"
                    value={form.price}
                    onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseDate">วันที่ซื้อ</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={form.purchaseDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, purchaseDate: event.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="source">แหล่งที่มา</Label>
                  <Select
                    value={form.source || "none"}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, source: value === "none" ? "" : value }))
                    }
                  >
                    <SelectTrigger id="source" className="w-full">
                      <SelectValue placeholder="เลือกแหล่งที่มา" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ไม่ระบุ</SelectItem>
                      {sourceOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="coverUrl">ลิงก์รูปปก (ถ้ามี)</Label>
                <Input
                  id="coverUrl"
                  type="text"
                  value={form.coverUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, coverUrl: event.target.value }))}
                />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <input type="file" accept="image/*" className="hidden" ref={coverFileRef} onChange={handleCoverFileChange} />
                  <Button type="button" variant="outline" size="sm" onClick={() => coverFileRef.current?.click()}>
                    อัปโหลดไฟล์ภาพ
                  </Button>
                  {coverUploadStatus && <p className="text-xs text-slate-500">{coverUploadStatus}</p>}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  หากเว้นว่าง ระบบจะพยายามดึงภาพจาก Open Library อัตโนมัติโดยอ้างอิง ISBN/บาร์โค้ด
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">{dialogMode === "create" ? "บันทึกหนังสือใหม่" : "บันทึกการแก้ไข"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>นำเข้าหนังสือจาก JSON</DialogTitle>
            <DialogDescription>
              รองรับไฟล์ JSON/Worksheet ที่ใช้คีย์เดียวกับระบบ เช่น assumptionCode, barcode, title, category, shelfCode, author และ ISBN
              หากต้องการให้ไฟล์เป็นแหล่งข้อมูลหลัก สามารถเลือก "ลบหนังสือที่ไม่มีในไฟล์" หลังจากนำเข้าเพื่ออัปเดตรายการให้ตรงกัน
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {importStatus && <p className="text-sm text-emerald-600">{importStatus}</p>}
            {importError && <p className="text-sm text-red-600">{importError}</p>}
            {importWarning && (
              <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <p className="font-medium">{importWarning.message}</p>
                {importWarning.sampleCodes?.length ? (
                  <p className="text-xs">
                    ตัวอย่างรหัส: {importWarning.sampleCodes.slice(0, 5).join(", ")}
                    {importWarning.missingCount > importWarning.sampleCodes.length ? " ..." : ""}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      runImport(
                        pendingImportFile ? undefined : pendingImportPayload || importPayload,
                        "update",
                        pendingImportFile ?? importFile
                      )
                    }
                    disabled={importing}
                  >
                    เก็บเฉพาะรายการที่อยู่ในไฟล์
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      runImport(
                        pendingImportFile ? undefined : pendingImportPayload || importPayload,
                        "delete",
                        pendingImportFile ?? importFile
                      )
                    }
                    disabled={importing}
                  >
                    ลบหนังสือที่ไม่มีในไฟล์
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setImportWarning(null)
                      setPendingImportPayload("")
                      setPendingImportFile(null)
                    }}
                  >
                    ยกเลิก
                  </Button>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <input type="file" accept=".json,.txt" ref={importFileRef} className="hidden" onChange={handleImportFile} />
              <Button variant="outline" onClick={() => importFileRef.current?.click()}>
                เลือกไฟล์ JSON
              </Button>
              {importFile && (
                <p className="text-xs text-slate-500">ไฟล์ที่เลือก: {importFile.name} ({(importFile.size / (1024 * 1024)).toFixed(2)} MB)</p>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  setImportPayload(sampleImportPayload)
                  setImportFile(null)
                }}
              >
                ใช้ตัวอย่าง
              </Button>
            </div>
            <Textarea
              className="h-48 w-full rounded-lg border border-slate-200 p-3 font-mono text-sm"
              value={importPayload}
              onChange={(event) => setImportPayload(event.target.value)}
            />
            <DialogFooter>
              <Button onClick={handleImportBooks} disabled={importing}>
                {importing ? "กำลังนำเข้า..." : "นำเข้าหนังสือ"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={monthlyReportDialogOpen} onOpenChange={setMonthlyReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ส่งออกสถิติการยืม-คืนรายเดือน</DialogTitle>
            <DialogDescription>
              ระบบจะสร้างไฟล์ Excel ที่รวมประวัติการยืม-คืนในเดือนที่เลือก พร้อมสรุปจำนวนเล่มตามระดับชั้นและหมวดหมู่
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {monthlyReportError && <p className="text-sm text-red-600">{monthlyReportError}</p>}
            <div>
              <Label htmlFor="monthly-report-month">เลือกเดือน</Label>
              <Input
                id="monthly-report-month"
                type="month"
                value={monthlyReportMonth}
                max="9999-12"
                onChange={(event) => setMonthlyReportMonth(event.target.value)}
              />
            </div>
            <p className="text-sm text-slate-500">
              แนะนำให้สร้างรายงานทุกสิ้นเดือน เพื่อเก็บข้อมูลการยืม-คืนและนำไปใช้ประกอบการประเมินห้องสมุด
            </p>
            <DialogFooter>
              <Button onClick={() => void handleDownloadMonthlyReport()} disabled={downloadingMonthlyReport}>
                {downloadingMonthlyReport ? "กำลังสร้างรายงาน..." : "ดาวน์โหลดรายงาน"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(barcodePreviewBook)} onOpenChange={(open) => {
        if (!open) {
          setBarcodePreviewBook(null)
          setBarcodeMode("assumption")
        }
      }}>
        <DialogContent className="max-w-md rounded-[32px] border border-slate-200 bg-white p-6 text-center">
          {barcodePreviewBook && (
            <>
              <DialogHeader className="space-y-1">
                <DialogTitle>พิมพ์บาร์โค้ดหนังสือ</DialogTitle>
                <DialogDescription>
                  {barcodePreviewBook.title} · รหัส {barcodePreviewBook.assumptionCode}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-xs">
                  <span
                    className={`cursor-pointer rounded-full px-3 py-1 ${barcodeMode === "assumption" ? "bg-blue-600 text-white" : "bg-slate-100"}`}
                    onClick={() => setBarcodeMode("assumption")}
                  >
                    โค้ดอัสสัม
                  </span>
                  <span
                    className={`cursor-pointer rounded-full px-3 py-1 ${barcodeMode === "library" ? "bg-blue-600 text-white" : "bg-slate-100"}`}
                    onClick={() => setBarcodeMode("library")}
                  >
                    Shelf/Author/Edition
                  </span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  {barcodeImageData ? (
                    <img src={barcodeImageData} alt="label barcode" className="mx-auto rounded-xl bg-white p-3" />
                  ) : (
                    <div className="text-sm text-slate-500">กำลังสร้างบาร์โค้ด...</div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <a
                    href={barcodeImageData || barcodePreviewUrl}
                    download={`${barcodePreviewBook.assumptionCode || "barcode"}.png`}
                    className="w-full"
                  >
                    <Button className="w-full" disabled={!barcodeImageData}>
                      ดาวน์โหลดภาพบาร์โค้ด
                    </Button>
                  </a>
                  <p className="text-xs text-slate-500">
                    ไฟล์ที่ดาวน์โหลดรวมชื่อหนังสือและรหัส สามารถพิมพ์เป็นสติกเกอร์เพื่อติดบนหนังสือได้ทันที
                  </p>
                </div>
              </div>
            </>
          )}
          <canvas ref={barcodeCanvasRef} className="hidden" />
        </DialogContent>
      </Dialog>
    </div>
  )
}
function formatMonthLabel(year: number, month: number): string {
  return `${month.toString().padStart(2, "0")}/${year}`
}

function formatDateTimeCell(value: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function buildMonthlyReportRows(payload: MonthlyReportPayload): Array<(string | number)[]> {
  const now = new Date()
  const rows: Array<(string | number)[]> = []
  const monthLabel = formatMonthLabel(payload.period.year, payload.period.month)

  rows.push([`รายงานสถิติการยืม-คืนประจำเดือน ${monthLabel}`])
  rows.push([`สร้างเมื่อ`, now.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })])
  rows.push([])

  rows.push([`จำนวนเล่มที่ยืมตามระดับชั้น (${monthLabel})`])
  rows.push(["ระดับชั้น", "จำนวนเล่ม"])
  if (payload.classStats.length) {
    payload.classStats.forEach((stat) => rows.push([stat.classLevel || "ไม่ระบุ", stat.total]))
  } else {
    rows.push(["ไม่มีข้อมูล", 0])
  }
  rows.push([])

  rows.push([`จำนวนเล่มที่ยืมตามหมวดหมู่ (${monthLabel})`])
  rows.push(["หมวดหมู่", "จำนวนเล่ม"])
  if (payload.categoryStats.length) {
    payload.categoryStats.forEach((stat) => rows.push([stat.category || "ไม่ระบุ", stat.total]))
  } else {
    rows.push(["ไม่มีข้อมูล", 0])
  }
  rows.push([])

  rows.push([`ประวัติการยืม-คืน (${monthLabel})`])
  rows.push(["วันที่ยืม", "วันที่คืน", "สถานะ", "รหัสหนังสือ", "ชื่อหนังสือ", "นักเรียน", "ระดับชั้น", "หมวดหมู่"])
  if (payload.transactions.length) {
    payload.transactions.forEach((transaction) => {
      rows.push([
        formatDateTimeCell(transaction.borrowedAt),
        formatDateTimeCell(transaction.returnedAt),
        transaction.returnedAt ? "คืนแล้ว" : "กำลังยืม",
        transaction.assumptionCode,
        transaction.title,
        transaction.studentName,
        transaction.classLevel || "ไม่ระบุ",
        transaction.category || "ไม่ระบุ",
      ])
    })
  } else {
    rows.push(["-", "-", "-", "-", "ไม่มีข้อมูลในเดือนนี้", "-", "-", "-"])
  }

  return rows
}
