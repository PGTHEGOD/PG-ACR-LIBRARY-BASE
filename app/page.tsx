"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import type { BookRecord, LoanRecord, ScoreEntry, LibraryStudentProfile } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { ScanLine, BookOpenCheck, History, Sparkles } from "lucide-react"
import StudentRegister from "@/components/student-register"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface BorrowResponse {
  book: BookRecord | null
  loan?: LoanRecord
}

interface QuickAddFormState {
  assumptionCode: string
  barcode: string
  title: string
  author: string
  category: string
  shelfCode: string
  authorCode: string
  edition: string
  isbn: string
  subject: string
  publisher: string
  publishYear: string
  pages: string
  price: string
}

function buildQuickAddDefaults(code: string): QuickAddFormState {
  const trimmed = code?.trim().toUpperCase() ?? ""
  return {
    assumptionCode: trimmed,
    barcode: trimmed,
    title: "",
    author: "",
    category: "",
    shelfCode: "",
    authorCode: "",
    edition: "1",
    isbn: "",
    subject: "",
    publisher: "",
    publishYear: `${new Date().getFullYear()}`,
    pages: "200",
    price: "0",
  }
}

export default function Home() {
  const [accessReady, setAccessReady] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [accessCode, setAccessCode] = useState("")
  const [accessError, setAccessError] = useState("")
  const [accessSubmitting, setAccessSubmitting] = useState(false)

  const [studentId, setStudentId] = useState("")
  const [studentProfile, setStudentProfile] = useState<LibraryStudentProfile | null>(null)
  const [studentLoading, setStudentLoading] = useState(false)
  const [studentError, setStudentError] = useState("")
  const [showRegister, setShowRegister] = useState(false)

  const bookInputRef = useRef<HTMLInputElement | null>(null)
  const [bookCode, setBookCode] = useState("")
  const [activeBookCode, setActiveBookCode] = useState("")
const [bookData, setBookData] = useState<BookRecord | null>(null)
const [bookMessage, setBookMessage] = useState("")
const [bookLoading, setBookLoading] = useState(false)
const [bookDialogOpen, setBookDialogOpen] = useState(false)
const [missingBookCode, setMissingBookCode] = useState("")
  const [quickAddInvite, setQuickAddInvite] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const [pointInput, setPointInput] = useState("5")
  const [pointNote, setPointNote] = useState("เพิ่มคะแนนความมีระเบียบ")
  const [pointSubmitting, setPointSubmitting] = useState(false)

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const response = await fetch("/api/access", { cache: "no-store" })
        if (!response.ok) throw new Error("unauthorized")
        setHasAccess(true)
      } catch {
        setHasAccess(false)
      } finally {
        setAccessReady(true)
      }
    }
    verifyAccess()
  }, [])

  useEffect(() => {
    if (!bookDialogOpen) {
      setBookCode("")
      setBookData(null)
      setBookMessage("")
      setBookLoading(false)
      setQuickAddInvite(false)
      setQuickAddOpen(false)
    }
  }, [bookDialogOpen])

  const handleAccessSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAccessSubmitting(true)
    setAccessError("")
    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: accessCode }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || "รหัสไม่ถูกต้อง")
      }
      setHasAccess(true)
      setAccessCode("")
    } catch (error) {
      setAccessError((error as Error).message || "รหัสไม่ถูกต้อง")
    } finally {
      setAccessSubmitting(false)
    }
  }

  const fetchStudent = async (id: string) => {
    const trimmed = id.trim()
    if (!trimmed) {
      setStudentError("กรุณากรอกรหัสนักเรียน")
      setStudentProfile(null)
      return
    }
    setStudentLoading(true)
    setStudentError("")
    try {
      const response = await fetch(`/api/library/students/${trimmed}`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || "ไม่พบนักเรียน")
      }
      setStudentProfile(payload)
      setShowRegister(false)
    } catch (error) {
      const message = (error as Error).message || "ไม่สามารถโหลดข้อมูลนักเรียนได้"
      setStudentProfile(null)
      setStudentError(message)
      setShowRegister(message.includes("ไม่พบนักเรียน"))
    } finally {
      setStudentLoading(false)
    }
  }

  const handleStudentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await fetchStudent(studentId)
  }

  const fetchBook = async (code: string) => {
    let trimmed = code.trim()
    if (trimmed.length > 0 && trimmed.length < 6) {
      trimmed = trimmed.padStart(6, "0")
    }
    if (!trimmed) {
      setBookMessage("กรุณากรอกรหัสหนังสือ")
      setBookData(null)
      return
    }
    setBookLoading(true)
    setBookMessage("")
    setBookData(null)
    try {
      const response = await fetch(`/api/library/books/${trimmed}`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || "ไม่พบหนังสือ")
      }
      setBookData(payload)
      setActiveBookCode(trimmed)
      setMissingBookCode("")
      setBookCode("")
      setQuickAddInvite(false)
      setQuickAddOpen(false)
      bookInputRef.current?.focus()
    } catch (error) {
      setBookData(null)
      const message = (error as Error).message || "ไม่พบหนังสือ"
      const scannedCode = bookCode.trim()
      setBookMessage(message)
      if (message.includes("ไม่พบ") && scannedCode) {
        setQuickAddInvite(true)
        setQuickAddOpen(false)
        let paddedCode = scannedCode
        if (paddedCode.length > 0 && paddedCode.length < 6) {
          paddedCode = paddedCode.padStart(6, "0")
        }
        setMissingBookCode(paddedCode)
      } else {
        setQuickAddInvite(false)
        setQuickAddOpen(false)
      }
      setBookCode("")
      bookInputRef.current?.focus()
    } finally {
      setBookLoading(false)
    }
  }

  const handleBookSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!studentProfile) {
      setBookMessage("กรุณาเลือกรหัสนักเรียนก่อน")
      return
    }
    let trimmed = bookCode.trim()
    if (trimmed.length > 0 && trimmed.length < 6) {
      trimmed = trimmed.padStart(6, "0")
    }
    if (!trimmed) {
      setBookMessage("กรุณากรอกรหัสหนังสือ")
      return
    }
    await fetchBook(trimmed)
    setActiveBookCode(trimmed)
  }

  const handleBorrowOrReturn = async (action: "borrow" | "return") => {
    if (!studentProfile?.student.studentCode) {
      setBookMessage("กรุณาเลือกรหัสนักเรียนก่อน")
      return
    }
    let trimmed = bookCode.trim()
    if (trimmed.length > 0 && trimmed.length < 6) {
      trimmed = trimmed.padStart(6, "0")
    }
    const effectiveCode = trimmed || activeBookCode
    if (!effectiveCode) {
      setBookMessage("กรุณากรอกรหัสหนังสือ")
      return
    }
    setBookLoading(true)
    setBookMessage("")
    try {
      const response = await fetch(`/api/library/books/${action === "borrow" ? "borrow" : "return"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: studentProfile.student.studentCode, code: effectiveCode }),
      })
      const payload: BorrowResponse = await response.json().catch(() => ({} as BorrowResponse))
      if (!response.ok) {
        throw new Error((payload as any)?.error || "ไม่สามารถดำเนินการได้")
      }
      setBookData(payload.book ?? null)
      bookInputRef.current?.focus()
      setActiveBookCode(effectiveCode)
      await fetchStudent(studentProfile.student.studentCode)
      setBookMessage(action === "borrow" ? "บันทึกการยืมเรียบร้อย" : "บันทึกการคืนเรียบร้อย")
    } catch (error) {
      setBookMessage((error as Error).message || "ไม่สามารถดำเนินการได้")
    } finally {
      setBookLoading(false)
    }
  }

  const handleOpenQuickAdd = () => {
    setQuickAddOpen(true)
  }

  const handleQuickAddSuccess = (record: BookRecord) => {
    setBookData(record)
    setBookMessage("เพิ่มหนังสือใหม่แล้ว สามารถดำเนินการยืมได้ทันที")
    setQuickAddInvite(false)
    setQuickAddOpen(false)
      setBookCode("")
      bookInputRef.current?.focus()
    setActiveBookCode(record.assumptionCode)
    setMissingBookCode("")
  }

  const handleAddPoints = async () => {
    if (!studentProfile?.student.studentCode) {
      setStudentError("กรุณาเลือกรหัสนักเรียนก่อน")
      return
    }
    const parsed = Number(pointInput)
    if (!Number.isFinite(parsed) || parsed === 0) {
      setStudentError("จำนวนคะแนนไม่ถูกต้อง")
      return
    }
    setPointSubmitting(true)
    try {
      const response = await fetch("/api/library/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: studentProfile.student.studentCode, points: parsed, note: pointNote }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || "ไม่สามารถบันทึกคะแนนได้")
      }
      setStudentProfile(payload)
      setPointInput("5")
    } catch (error) {
      setStudentError((error as Error).message || "ไม่สามารถบันทึกคะแนนได้")
    } finally {
      setPointSubmitting(false)
    }
  }

  const recentScores: ScoreEntry[] = useMemo(() => studentProfile?.scoreHistory?.slice(0, 4) ?? [], [studentProfile])
  const recentLoans: LoanRecord[] = useMemo(() => studentProfile?.loans?.slice(0, 6) ?? [], [studentProfile])
  const borrowerMismatch = useMemo(() => {
    if (!bookData || bookData.status !== "borrowed") return false
    const activeCode = studentProfile?.student.studentCode?.trim()
    if (!activeCode) return false
    if (!bookData.borrowedBy) return false
    return bookData.borrowedBy !== activeCode
  }, [bookData, studentProfile])
  const maxBorrowReached = useMemo(() => {
    if (!studentProfile) return false
    if (studentProfile.restrictions?.requireFullReturn) return true
    return (studentProfile.stats?.activeLoans ?? 0) >= 2
  }, [studentProfile])

  if (!accessReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        กำลังตรวจสอบสิทธิ์การใช้งานอุปกรณ์...
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
          <div className="flex justify-center">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-blue-50 p-3">
              <Image src="/assumption-rayoung.png" alt="Assumption College Rayong" fill className="object-contain" />
            </div>
          </div>
          <p className="text-sm font-medium text-blue-700">การยืนยันอุปกรณ์</p>
          <h1 className="text-2xl font-bold text-slate-900">ยืนยันอุปกรณ์ก่อนเข้าใช้งาน</h1>
          <p className="text-sm text-slate-600">
            โปรดระบุรหัสสำหรับอุปกรณ์ที่ได้รับจากห้องสมุด เพื่อป้องกันการเข้าใช้งานจากภายนอก
          </p>
          <form onSubmit={handleAccessSubmit} className="space-y-4">
            <input
              type="password"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="กรอกรหัสอุปกรณ์"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              disabled={accessSubmitting}
              required
            />
            {accessError && <p className="text-sm text-red-600">{accessError}</p>}
            <button
              type="submit"
              disabled={!accessCode || accessSubmitting}
              className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {accessSubmitting ? "กำลังตรวจสอบ..." : "ยืนยันรหัส"}
            </button>
          </form>
          <p className="text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Assumption College Rayong Library · Dev. by{" "}
            <a href="https://github.com/PGTHEGOD" target="_blank" rel="noreferrer" className="text-blue-700 underline underline-offset-2">
              Park AKA PG Dev.
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-slate-100 bg-white px-4 py-4">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-blue-50">
              <Image src="/assumption-rayoung.png" alt="Assumption College Rayong" fill className="object-contain p-2" priority />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-blue-700">Assumption College Rayong</p>
              <p className="text-lg font-semibold text-slate-900">ระบบยืม-คืนหนังสือสำหรับครู</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">Teacher Mode</Badge>
            <Link href="/books">
              <Button variant="link" className="text-blue-700">
                จัดการหนังสือทั้งหมด
              </Button>
            </Link>
            <Link href="/students">
              <Button variant="link" className="text-blue-700">
                จัดการข้อมูลนักเรียน
              </Button>
            </Link>
          </div>
        </div>
      </header>


      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <Card className="rounded-3xl border border-slate-200 shadow-sm">
            <CardHeader className="space-y-3">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">กรอกรหัสนักเรียนเพื่อเริ่มทำรายการ</h1>
                <p className="mt-2 text-sm text-slate-600">
                  ใช้รหัสเดียวกับระบบลงทะเบียน นักเรียนที่ได้รับสิทธิ์แล้วจะพร้อมสำหรับการยืม-คืนและปรับคะแนน
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <form onSubmit={handleStudentSubmit} className="space-y-3">
                <label className="text-sm font-medium text-slate-600" htmlFor="student-id-input">
                  รหัสนักเรียน
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    id="student-id-input"
                    placeholder="เช่น 17685"
                    value={studentId}
                    onChange={(event) => setStudentId(event.target.value)}
                    className="h-14 flex-1 text-lg"
                  />
                  <Button type="submit" className="h-14 px-8 text-base" disabled={studentLoading}>
                    {studentLoading ? "กำลังค้นหา..." : "แสดงข้อมูล"}
                  </Button>
                </div>
                {studentError && <p className="text-sm text-red-600">{studentError}</p>}
                <p className="text-xs text-slate-500">
                  ระบบจะใช้รหัสนักเรียนนี้กับหน้าต่างสแกนหนังสือและการบันทึกคะแนนทั้งหมด
                </p>
              </form>
              {showRegister && studentId && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                  <StudentRegister
                    studentId={studentId}
                    onComplete={() => {
                      setShowRegister(false)
                      fetchStudent(studentId)
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="rounded-3xl border border-slate-200 shadow-sm">
            <CardContent className="space-y-5">
              {studentProfile ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-slate-500">นักเรียนที่เลือก</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {studentProfile.student.title ? `${studentProfile.student.title} ` : ""}
                      {studentProfile.student.firstName} {studentProfile.student.lastName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {studentProfile.student.classLevel}
                      {studentProfile.student.room ? `/${studentProfile.student.room}` : ""} · เลขที่{" "}
                      {studentProfile.student.number || "-"}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-500">คะแนนสะสม</p>
                      <p className="text-3xl font-bold text-slate-900">{studentProfile.stats.points}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-500">กำลังยืม</p>
                      <p className="text-2xl font-semibold text-slate-900">{studentProfile.stats.activeLoans} เล่ม</p>
                      <p className="text-xs text-slate-500">ทั้งหมด {studentProfile.stats.totalLoans} รายการ</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">รหัสนักเรียน</p>
                    <p className="text-xl font-semibold text-slate-900">{studentProfile.student.studentCode}</p>
                  </div>
                  <div className="space-y-2">
                    <Button
                      type="button"
                      onClick={() => setBookDialogOpen(true)}
                      className="h-12 w-full justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <ScanLine className="h-4 w-4" />
                      เปิดหน้าสแกนหนังสือ
                    </Button>
                    <p className="text-center text-xs text-slate-500">รองรับรหัสอัสสัม 6 หลักและเครื่องสแกนบาร์โค้ด</p>
                  </div>
                </>
              ) : (
                <div className="space-y-3 text-slate-600">
                  <h2 className="text-xl font-semibold text-slate-900">ยังไม่เลือกรหัสนักเรียน</h2>
                  <p className="text-sm">
                    กรอกรหัส 5 หลักของนักเรียนเพื่อดูสถิติ คะแนน และเปิดหน้าต่างสแกนหนังสือแบบปลอดภัย
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    <li>รองรับฐานข้อมูลเดียวกับระบบลงทะเบียน</li>
                    <li>ข้อมูลการยืมและคะแนนจะอัปเดตทันทีหลังทำรายการ</li>
                    <li>สามารถเปิดหน้าสแกนได้เฉพาะหลังเลือกรหัสนักเรียน</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {studentProfile ? (
          <>
            
            <section className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
              <Card className="rounded-3xl border border-slate-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Sparkles className="h-5 w-5" />
                    ปรับคะแนนรางวัล
                  </CardTitle>
                  <p className="text-sm text-slate-500">ระบุคะแนนบวก/ลบ พร้อมหมายเหตุประกอบการให้รางวัล</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row">
                    <Input
                      type="number"
                      placeholder="จำนวนคะแนน เช่น 5 หรือ -3"
                      value={pointInput}
                      onChange={(event) => setPointInput(event.target.value)}
                      className="h-12 md:w-40"
                    />
                    <Input
                      placeholder="หมายเหตุ เช่น ความมีระเบียบ"
                      value={pointNote}
                      onChange={(event) => setPointNote(event.target.value)}
                      className="h-12 flex-1"
                    />
                    <Button type="button" onClick={handleAddPoints} disabled={pointSubmitting} className="h-12 md:w-40">
                      {pointSubmitting ? "กำลังบันทึก..." : "บันทึกคะแนน"}
                    </Button>
                  </div>
                  {recentScores.length ? (
                    <div className="space-y-2 text-sm text-slate-600">
                      {recentScores.map((entry) => {
                        // console.log(entry)
                        return (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-2"
                          >
                            <div>
                              <p className="font-medium text-slate-900">{entry.note}</p>
                              <p className="text-xs text-slate-500">
                              {new Date(entry.createdAt).toLocaleString("th-TH", {
                                    timeZone: "UTC"
                                  
                                  })}
                              </p>
                            </div>

                            <span className={entry.change >= 0 ? "text-emerald-600" : "text-red-600"}>
                              {entry.change > 0 ? "+" : ""}
                              {entry.change}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">ยังไม่มีประวัติการปรับคะแนน</p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-slate-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <History className="h-5 w-5" />
                    ประวัติการยืม-คืนล่าสุด
                  </CardTitle>
                  {/* <p className="text-sm text-slate-500">อัปเดตแบบเรียลไทม์สำหรับครู</p> */}
                </CardHeader>
                <CardContent>
                  {recentLoans.length ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-100">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ชื่อหนังสือ</TableHead>
                            <TableHead>ยืมเมื่อ</TableHead>
                            <TableHead>คืนเมื่อ</TableHead>
                            <TableHead>สถานะ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentLoans.map((loan) => (
                            <TableRow key={loan.id}>
                              <TableCell className="font-medium text-slate-900">{loan.title}</TableCell>
                        <TableCell>
                          {new Date(loan.borrowedAt).toLocaleDateString("th-TH", { timeZone: "UTC" })}
                        </TableCell>
                        <TableCell>
                        {loan.returnedAt
                            ? new Date(loan.returnedAt).toLocaleDateString("th-TH", { timeZone: "UTC" })
                            : "-"}

                        </TableCell>
                              <TableCell>
                                <Badge variant={loan.status === "borrowed" ? "default" : "outline"}>
                                  {loan.status === "borrowed" ? "กำลังยืม" : "คืนแล้ว"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">ยังไม่มีประวัติการยืม</p>
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm text-slate-500">
            เมื่อกรอกรหัสนักเรียน ระบบจะแสดงสถิติและเครื่องมือทั้งหมดที่นี่
          </div>
        )}
      </main>

      <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
        <DialogContent className="overflow-hidden border border-slate-200 p-0 shadow-2xl lg:rounded-[32px]">
          <div className="flex flex-col lg:flex-row">
            <div className="flex-1 space-y-4 bg-gradient-to-b from-blue-50 via-white to-white p-6">
              <DialogHeader className="text-left space-y-1">
                <DialogTitle className="flex flex-wrap items-center gap-2 text-blue-900">
                  <BookOpenCheck className="h-5 w-5 text-blue-600" />
                  สแกนหรือใส่รหัสหนังสือ
                </DialogTitle>
                <DialogDescription className="text-slate-600">
                  เลือกนักเรียนก่อน แล้วสแกนรหัสอัสสัม 6 หลักหรือยิงบาร์โค้ดเพื่อค้นหาเล่มที่ต้องการ
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleBookSubmit} className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <Input
                  ref={bookInputRef}
                  autoFocus
                  placeholder="เช่น A01234 หรือสแกนจากเครื่องยิง"
                  value={bookCode}
                  onChange={(event) => setBookCode(event.target.value)}
                  className="h-12 text-base"
                />
                <Button type="submit" className="h-12 w-full" disabled={bookLoading}>
                  {bookLoading ? "กำลังดึงข้อมูล..." : "แสดงข้อมูลหนังสือ"}
                </Button>
              </form>

              {bookMessage && (
                <p className={`text-sm ${bookMessage.includes("เรียบร้อย") ? "text-emerald-600" : "text-red-600"}`}>
                  {bookMessage}
                </p>
              )}

              <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
                แนะนำ: เลือกนักเรียน → เปิดหน้าต่างนี้ → ยิงบาร์โค้ดหรือพิมพ์รหัส 6 หลัก แล้วกดบันทึกการยืม/คืน
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-6 bg-white p-6">
              {bookData ? (
                <>
                  <div className="grid gap-4 lg:grid-cols-[180px,1fr]">
                    <div className="relative mx-auto aspect-[3/4] w-full max-w-[200px] overflow-hidden rounded-2xl bg-slate-100 shadow">
                      <Image src={bookData.coverUrl} alt={bookData.title} fill className="object-cover" sizes="(max-width:768px) 50vw, 200px" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full bg-slate-100 px-3 py-1">รหัส {bookData.assumptionCode}</span>
                        {bookData.isbn && <span className="rounded-full bg-slate-100 px-3 py-1">ISBN {bookData.isbn}</span>}
                        <span className="rounded-full bg-slate-100 px-3 py-1">หมวด {bookData.category}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          ฉบับที่ {bookData.edition || "-"}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">ข้อมูลหนังสือ</p>
                        <h3 className="text-2xl font-semibold text-slate-900 leading-tight">{bookData.title}</h3>
                        <p className="text-sm text-slate-600">{bookData.author || "ไม่ระบุผู้แต่ง"}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 p-3 text-sm">
                          <p className="text-xs text-slate-500">สถานะ</p>
                          <p className="text-lg font-semibold text-slate-900">
                            {bookData.status === "available" ? "พร้อมยืม" : "กำลังยืม"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 text-sm">
                          <p className="text-xs text-slate-500">ผู้ยืม</p>
                          <p className="text-sm font-medium text-slate-900">
                            {bookData.borrowedStudentName || bookData.borrowedBy || "-"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 text-sm">
                          <p className="text-xs text-slate-500">กำหนดคืน</p>
                          <p className="text-sm font-medium text-slate-900">
                            {bookData.dueDate
                              ? new Date(bookData.dueDate).toLocaleDateString("th-TH", { timeZone: "UTC" })
                              : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      type="button"
                      onClick={() => handleBorrowOrReturn("borrow")}
                      disabled={bookLoading || !studentProfile || bookData.status === "borrowed" || maxBorrowReached}
                      className={`h-12 w-full justify-center gap-2 ${
                        maxBorrowReached
                          ? "border border-red-600 bg-red-600 text-white hover:bg-red-700"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      } disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400`}
                    >
                      บันทึกการยืม
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleBorrowOrReturn("return")}
                      disabled={bookLoading || !studentProfile || bookData.status !== "borrowed" || borrowerMismatch}
                      className="h-12 w-full justify-center gap-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    >
                      บันทึกการคืน
                    </Button>
                  </div>

                  {borrowerMismatch && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      เล่มนี้ถูกยืมโดย {bookData.borrowedStudentName || bookData.borrowedBy} เท่านั้น นักเรียนที่เลือกไม่สามารถคืนได้
                    </div>
                  )}
                  {maxBorrowReached && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                      {studentProfile?.restrictions?.requireFullReturn
                        ? "นักเรียนคนนี้ต้องคืนหนังสือที่ค้างทั้งหมดก่อนยืมใหม่ (ยืมได้สูงสุด 2 เล่มต่อรอบการยืม)"
                        : "นักเรียนคนนี้ยืมครบ 2 เล่มแล้ว กรุณาคืนอย่างน้อย 1 เล่มก่อนกดยืมอีกครั้ง"}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4 text-slate-600">
                  <p className="text-lg font-semibold text-slate-900">พร้อมสำหรับการสแกน</p>
                  <p className="text-sm">
                    เลือกนักเรียนก่อน แล้วเปิดหน้าต่างนี้เพื่อสแกนหรือกรอกรหัส 6 หลักให้กับหนังสือทุกเล่ม
                  </p>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                    ระบบจะบันทึกการยืม-คืนอัตโนมัติพร้อมชื่อผู้ยืม
                  </div>
                  {quickAddInvite && (
                    <div className="space-y-3 rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 p-4 text-sm text-rose-900">
                      <div className="flex flex-col gap-1">
                        <p className="font-semibold">ไม่พบรหัส {missingBookCode || bookCode || "หนังสือ"}</p>
                        <p>เพิ่มหนังสือเล่มนี้เข้าระบบได้ทันทีเพื่อให้ครูสามารถบันทึกการยืมได้ต่อเนื่อง</p>
                      </div>
                      {!quickAddOpen ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-rose-300 text-rose-700"
                          onClick={() => {
                            setQuickAddOpen(true)
                          }}
                        >
                          + เพิ่มข้อมูลหนังสือจากรหัสนี้
                        </Button>
                      ) : (
                        <QuickAddBookForm code={missingBookCode || activeBookCode || bookCode} onSuccess={handleQuickAddSuccess} onCancel={() => setQuickAddOpen(false)} />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <footer className="mt-auto border-t border-slate-100 px-4 py-3 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Assumption College Rayong Library · Dev. by{" "}
        <a href="https://github.com/PGTHEGOD" className="text-blue-700 underline underline-offset-2" target="_blank" rel="noreferrer">
          Park AKA PG Dev.
        </a>
      </footer>
    </div>
  )
}

function QuickAddBookForm({
  code,
  onSuccess,
  onCancel,
}: {
  code: string
  onSuccess: (record: BookRecord) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<QuickAddFormState>(() => buildQuickAddDefaults(code))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [metadataStatus, setMetadataStatus] = useState("")

  useEffect(() => {
    setForm(buildQuickAddDefaults(code))
    setError("")
    setMetadataStatus("")
    if (code) {
      loadMetadataFromBarcode(code, true)
    }
  }, [code])

  const handleChange = (field: keyof QuickAddFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      const payload = {
        assumptionCode: form.assumptionCode.trim(),
        barcode: (form.barcode || form.assumptionCode).trim(),
        category: form.category.trim() || "ทั่วไป",
        shelfCode: form.shelfCode.trim() || "GEN",
        authorCode: form.authorCode.trim() || form.assumptionCode.trim(),
        edition: form.edition.trim() || "1",
        volumeNumber: "",
        language: "ไทย",
        printNumber: form.edition.trim() || "1",
        purchaseDate: "",
        source: "เพิ่มผ่านจุดยืม",
        title: form.title.trim(),
        isbn: form.isbn.trim() || "0000000000",
        subject: form.subject.trim() || "หัวเรื่องทั่วไป",
        author: form.author.trim() || "ไม่ระบุ",
        publisher: form.publisher.trim() || "ไม่ระบุ",
        publishYear: Number(form.publishYear) || new Date().getFullYear(),
        pages: Number(form.pages) || 0,
        price: Number(form.price) || 0,
        coverUrl: "",
      }
      if (!payload.assumptionCode || !payload.title) {
        throw new Error("กรุณากรอกชื่อหนังสือและรหัสให้ครบ")
      }
      const response = await fetch("/api/library/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถเพิ่มหนังสือได้")
      }
      onSuccess(data)
    } catch (err) {
      setError((err as Error).message || "ไม่สามารถเพิ่มหนังสือได้")
    } finally {
      setLoading(false)
    }
  }

  const applyRecordMetadata = (record: BookRecord) => {
    setForm((prev) => ({
      ...prev,
      barcode: prev.barcode || record.barcode || record.assumptionCode,
      title: record.title || prev.title,
      author: record.author || prev.author,
      publisher: record.publisher || prev.publisher,
      subject: record.subject || prev.subject,
      category: record.category || prev.category,
      shelfCode: record.shelfCode || prev.shelfCode,
      authorCode: record.authorCode || prev.authorCode,
      edition: record.edition || prev.edition,
      volumeNumber: record.volumeNumber || prev.volumeNumber,
      language: record.language || prev.language || "ไทย",
      printNumber: record.printNumber || prev.printNumber,
      pages: record.pages ? String(record.pages) : prev.pages,
      price: record.price ? String(record.price) : prev.price,
      publishYear: record.publishYear ? String(record.publishYear) : prev.publishYear,
      coverUrl: record.coverUrl || prev.coverUrl,
    }))
  }

  const loadMetadataFromBarcode = async (sourceCode: string, silent = false) => {
    const barcode = sourceCode.trim()
    if (!barcode) {
      if (!silent) setMetadataStatus("กรุณากรอกรหัสก่อนดึงข้อมูล")
      return
    }
    const isbn = barcode.replace(/[^0-9Xx]/g, "")
    if (isbn.length < 8) {
      if (!silent) setMetadataStatus("รูปแบบรหัสไม่ถูกต้อง")
      return
    }
    if (!silent) {
      setMetadataStatus("กำลังค้นหาในฐานข้อมูล...")
    }
    try {
      let internalRecord: BookRecord | null = null
      try {
        const resp = await fetch(`/api/library/books/${encodeURIComponent(barcode)}`)
        if (resp.ok) {
          internalRecord = await resp.json()
        }
      } catch {
        // ignore
      }
      if (internalRecord) {
        applyRecordMetadata(internalRecord)
        if (!silent) {
          setMetadataStatus("กรอกข้อมูลจากฐานข้อมูลอัตโนมัติแล้ว")
        }
        return
      }
      if (!silent) {
        setMetadataStatus("ไม่พบในฐานข้อมูล กำลังค้นจาก Open Library...")
      }
      let data: any | null = null
      let response = await fetch(`https://openlibrary.org/isbn/${isbn}.json`)
      if (response.ok) {
        data = await response.json()
      } else {
        response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`)
        if (response.ok) {
          const fallback = await response.json()
          data = fallback[`ISBN:${isbn}`] || null
        }
      }
      if (!data) {
        throw new Error("ไม่พบข้อมูลจาก Open Library")
      }
      const publishYear = typeof data.publish_date === "string" ? data.publish_date.match(/\d{4}/)?.[0] : undefined
      const title = data.title || data?.details?.title
      const author =
        data.by_statement ||
        data?.authors?.[0]?.name ||
        data?.authors?.[0]?.full_name ||
        (Array.isArray(data?.authors) && data.authors[0]?.key ? data.authors[0].key.split("/").pop() : "")
      const publisher = Array.isArray(data.publishers) ? data.publishers[0]?.name || data.publishers[0] : data.publisher
      const subject =
        (Array.isArray(data.subjects) ? data.subjects.map((item: any) => item?.name || item).filter(Boolean)[0] : undefined) ||
        ""
      const edition = data.edition_name || data.physical_format || ""
      const pages = data.number_of_pages ? String(data.number_of_pages) : form.pages
      setForm((prev) => ({
        ...prev,
        title: title || prev.title,
        author: author || prev.author,
        publisher: publisher || prev.publisher,
        subject: subject || prev.subject,
        publishYear: publishYear || prev.publishYear,
        pages,
        edition: edition || prev.edition,
        barcode: prev.barcode || barcode,
      }))
      if (!silent) {
        setMetadataStatus("ดึงข้อมูลจาก Open Library สำเร็จแล้ว กรุณาตรวจสอบก่อนบันทึก")
      }
    } catch (metaError) {
      if (!silent) {
        setMetadataStatus((metaError as Error).message || "ไม่พบข้อมูลจากฐานข้อมูลหรือ Open Library")
      }
    }
  }

  const fetchMetadataFromBarcode = () => {
    loadMetadataFromBarcode(form.barcode || form.assumptionCode)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-white/60 bg-white/80 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="quick-assumption">รหัสอัสสัม</Label>
          <Input
            id="quick-assumption"
            value={form.assumptionCode}
            onChange={(event) => handleChange("assumptionCode", event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="quick-barcode">บาร์โค้ด</Label>
          <Input id="quick-barcode" value={form.barcode} onChange={(event) => handleChange("barcode", event.target.value)} required />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={fetchMetadataFromBarcode}>
              ดึงข้อมูลจากบาร์โค้ด
            </Button>
            {metadataStatus && <p className="text-xs text-slate-500">{metadataStatus}</p>}
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="quick-title">ชื่อหนังสือ</Label>
          <Input id="quick-title" value={form.title} onChange={(event) => handleChange("title", event.target.value)} required />
        </div>
        <div>
          <Label htmlFor="quick-author">ผู้แต่ง</Label>
          <Input id="quick-author" value={form.author} onChange={(event) => handleChange("author", event.target.value)} />
        </div>
        <div>
          <Label htmlFor="quick-category">หมวดหมู่</Label>
          <Input
            id="quick-category"
            value={form.category}
            onChange={(event) => handleChange("category", event.target.value)}
            placeholder="เช่น 800 วรรณกรรม"
          />
        </div>
        <div>
          <Label htmlFor="quick-shelf">หมู่หนังสือ</Label>
          <Input
            id="quick-shelf"
            value={form.shelfCode}
            onChange={(event) => handleChange("shelfCode", event.target.value)}
            placeholder="เช่น FIC-01"
          />
        </div>
        <div>
          <Label htmlFor="quick-authorCode">เลขเรียกหนังสือ</Label>
          <Input id="quick-authorCode" value={form.authorCode} onChange={(event) => handleChange("authorCode", event.target.value)} />
        </div>
        <div>
          <Label htmlFor="quick-edition">ฉบับที่</Label>
          <Input id="quick-edition" value={form.edition} onChange={(event) => handleChange("edition", event.target.value)} />
        </div>
        <div>
          <Label htmlFor="quick-isbn">ISBN</Label>
          <Input id="quick-isbn" value={form.isbn} onChange={(event) => handleChange("isbn", event.target.value)} />
        </div>
        <div>
          <Label htmlFor="quick-subject">หัวเรื่อง</Label>
          <Input
            id="quick-subject"
            value={form.subject}
            onChange={(event) => handleChange("subject", event.target.value)}
            placeholder="หัวเรื่องหลัก"
          />
        </div>
        <div>
          <Label htmlFor="quick-publisher">สำนักพิมพ์</Label>
          <Input id="quick-publisher" value={form.publisher} onChange={(event) => handleChange("publisher", event.target.value)} />
        </div>
        <div>
          <Label htmlFor="quick-year">ปีที่พิมพ์</Label>
          <Input id="quick-year" value={form.publishYear} onChange={(event) => handleChange("publishYear", event.target.value)} />
        </div>
        <div>
          <Label htmlFor="quick-pages">จำนวนหน้า</Label>
          <Input
            id="quick-pages"
            value={form.pages}
            onChange={(event) => handleChange("pages", event.target.value)}
            placeholder="เช่น 220"
          />
        </div>
        <div>
          <Label htmlFor="quick-price">ราคา (บาท)</Label>
          <Input id="quick-price" value={form.price} onChange={(event) => handleChange("price", event.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "กำลังเพิ่ม..." : "บันทึกหนังสือใหม่"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          ยกเลิก
        </Button>
      </div>
    </form>
  )
}
