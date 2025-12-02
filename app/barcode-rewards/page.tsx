"use client"

import NextImage from "next/image"
import { useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createXlsxBlobFromRows } from "@/lib/xlsx"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Gift, ScanLine, Sparkles } from "lucide-react"

interface RewardApiResponse {
  student: {
    studentCode: string
    firstName: string
    lastName: string
    classLevel: string
  }
  recordedAt: string
  totalThisMonth: number
  firstInMonth: boolean
}

interface RewardLogEntry {
  id: number
  studentId: string
  firstName: string
  lastName: string
  classLevel: string
  scannedAt: string
}

interface RewardLogsResponse {
  period: { year: number; month: number; start: string; end: string } | null
  entries: RewardLogEntry[]
}

const worksheetLinks = [
  {
    label: "ใบตอบคำถาม ป.1 - ป.3",
    description: "เวิร์กชีตคำถามสำหรับนักเรียนระดับ ป.1-ป.3 ดาวน์โหลดและพิมพ์ได้ทันที",
    href: "/uploads/ตอบคำถาม ที่กล่องความรู้ ป.1-3.pdf",
  },
  {
    label: "ใบตอบคำถาม ป.4 - ป.6",
    description: "เวิร์กชีตคำถามสำหรับนักเรียนระดับ ป.4-ป.6 จัดรูปแบบพร้อมใช้งาน",
    href: "/uploads/ตอบคำถาม ที่กล่องความรู้ ป.4-6.pdf",
  },
]

function formatThaiDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function BarcodeRewardsPage() {
  const defaultMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  }, [])
  const [barcodeInput, setBarcodeInput] = useState("")
  const [studentCode, setStudentCode] = useState("")
  const [pendingBarcode, setPendingBarcode] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{
    type: "new" | "repeat"
    text: string
    detail?: string
    timestamp?: string
  } | null>(null)
  const [exportMonth, setExportMonth] = useState(defaultMonth)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState("")

  const handleScanSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!barcodeInput.trim()) {
      setStatusMessage(null)
      setSubmitError("กรุณาสแกนหรือกรอกรหัสบาร์โค้ด")
      return
    }
    setPendingBarcode(barcodeInput.trim())
    setBarcodeInput("")
    setStudentCode("")
    setSubmitError("")
    setDialogOpen(true)
  }

  const handleConfirmReward = async () => {
    if (!studentCode.trim()) {
      setSubmitError("กรุณาระบุรหัสนักเรียน")
      return
    }
    setSubmitting(true)
    setSubmitError("")
    try {
      const response = await fetch("/api/library/barcode-rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: studentCode.trim(), barcode: pendingBarcode }),
      })
      const data = (await response.json().catch(() => ({}))) as RewardApiResponse & { error?: string }
      if (!response.ok) {
        throw new Error(data.error || "บันทึกไม่สำเร็จ")
      }
      setDialogOpen(false)
      setStatusMessage({
        type: data.firstInMonth ? "new" : "repeat",
        text: data.firstInMonth
          ? `ให้คะแนน ${data.student.firstName} ${data.student.lastName} (ห้อง ${data.student.classLevel || "-"
            }) สำเร็จ`
          : `บันทึกซ้ำในเดือนนี้แล้ว แต่เพิ่มคะแนนให้เรียบร้อย`,
        detail: `สแกนครั้งที่ ${data.totalThisMonth} ของเดือน`,
        timestamp: formatThaiDateTime(data.recordedAt),
      })
      setStudentCode("")
      setPendingBarcode("")
    } catch (error) {
      setSubmitError((error as Error).message || "บันทึกไม่สำเร็จ")
    } finally {
      setSubmitting(false)
    }
  }

  const handleExportLogs = async () => {
    setExporting(true)
    setExportError("")
    try {
      const query = exportMonth ? `?month=${exportMonth}` : ""
      const response = await fetch(`/api/library/barcode-rewards${query}`)
      const payload = (await response.json().catch(() => ({}))) as RewardLogsResponse & { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "ไม่สามารถส่งออกรายงานได้")
      }
      const rows: Array<(string | number)[]> = [
        ["รายงานกิจกรรมตอบคำถามบาร์โค้ด"],
        [payload.period ? `ช่วงเวลา ${payload.period.start} ถึง ${payload.period.end}` : "รวมทุกช่วงเวลา"],
        [],
        ["วันเวลา", "รหัสนักเรียน", "ชื่อ-สกุล", "ระดับชั้น"],
      ]
      if (payload.entries.length) {
        payload.entries.forEach((entry) => {
          rows.push([
            formatThaiDateTime(entry.scannedAt),
            entry.studentId,
            `${entry.firstName} ${entry.lastName}`.trim() || "-",
            entry.classLevel || "ไม่ระบุ",
          ])
        })
      } else {
        rows.push(["ไม่มีข้อมูล", "-", "-", "-"])
      }
      const blob = createXlsxBlobFromRows(rows)
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `barcode-reward-${exportMonth || "all"}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setExportError((error as Error).message || "ไม่สามารถส่งออกรายงานได้")
    } finally {
      setExporting(false)
    }
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
              <p className="text-lg font-semibold text-slate-900">กิจกรรมห้องสมุดเคลื่อนที่</p>
              <p className="text-xs text-slate-500">ตอบคำถามผ่านการสแกนบาร์โค้ด · รับคะแนน +5</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/">
              <Button variant="link" className="text-blue-700">
                ← กลับไปหน้ายืม-คืน
              </Button>
            </Link>
            
            <Badge variant="outline">Mobile Library</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
      

        <Card className="rounded-3xl border border-slate-200 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <ScanLine className="h-5 w-5" /> บันทึกการสแกนประจำวัน
            </CardTitle>
            <p className="text-sm text-slate-500">สแกน &gt; กรอกรหัส &gt; ให้คะแนน · ระบบเตือนสีเมื่อร่วมกิจกรรมแล้วในเดือนนั้น</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {statusMessage && (
              <div
                className={`flex flex-col gap-1 rounded-2xl border px-4 py-3 text-sm ${statusMessage.type === "new"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                <p className="flex items-center gap-2 font-medium">
                  <Sparkles className="h-4 w-4" />
                  {statusMessage.text}
                </p>
                {statusMessage.detail && <p className="text-xs opacity-80">{statusMessage.detail}</p>}
                {statusMessage.timestamp && <p className="text-xs opacity-70">เวลา: {statusMessage.timestamp}</p>}
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
              <form onSubmit={handleScanSubmit} className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <div>
                  <Label htmlFor="barcode-input">สแกนบาร์โค้ดกิจกรรม</Label>
                  <Input
                    id="barcode-input"
                    value={barcodeInput}
                    onChange={(event) => setBarcodeInput(event.target.value)}
                    placeholder="สแกนหรือพิมพ์รหัสบาร์โค้ด (สแกนเนอร์จะกด Enter อัตโนมัติ)"
                    autoFocus
                    className="h-12 text-lg"
                  />
                </div>
                {submitError && <p className="text-sm text-red-600">{submitError}</p>}
                <Button type="submit" className="h-12 w-full text-base md:w-auto">
                  ดำเนินการต่อ
                </Button>
              </form>

              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">แนวทางการปฏิบัติ</p>
                <ol className="mt-3 space-y-2">
                  <li>1. ติดโปสเตอร์บาร์โค้ดที่จุดกิจกรรม และให้เด็กสแกนทีละคน</li>
                  <li>2. ระบบจะเปิดช่องให้กรอกรหัสนักเรียน (เจ้าหน้าที่เป็นผู้กรอก)</li>
                  <li>3. เมื่อบันทึกเสร็จ สีเขียว = ทำครั้งแรกของเดือน, สีเหลือง = ทำซ้ำ</li>
                  <li>4. สามารถดาวน์โหลดใบตอบคำถาม + รายงานกิจกรรมได้จากหัวข้อด้านล่าง</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-slate-200 shadow-sm">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>ดาวน์โหลดใบตอบคำถาม & รายงาน</CardTitle>
            <Badge variant="outline" className="w-fit">
              PDF / Excel
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {worksheetLinks.map((worksheet) => (
                <div key={worksheet.label} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-800">{worksheet.label}</p>
                  <p className="text-sm text-slate-500">{worksheet.description}</p>
                  <Button asChild variant="outline" className="mt-3 w-full">
                    <a href={worksheet.href} download target="_blank" rel="noreferrer">
                      <FileText className="mr-2 h-4 w-4" /> ดาวน์โหลด PDF
                    </a>
                  </Button>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="font-semibold text-slate-800">ส่งออกบันทึกการสแกนเป็น Excel</p>
              <p className="text-sm text-slate-500">เลือกเดือนที่ต้องการ หรือปล่อยว่างเพื่อส่งออกทั้งหมด</p>
              <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
                <Input
                  type="month"
                  className="md:w-56"
                  value={exportMonth}
                  onChange={(event) => setExportMonth(event.target.value)}
                />
                <Button onClick={() => void handleExportLogs()} disabled={exporting} className="md:w-auto">
                  <Download className="mr-2 h-4 w-4" />
                  {exporting ? "กำลังสร้างไฟล์..." : "ส่งออก Excel"}
                </Button>
              </div>
              {exportError && <p className="mt-2 text-sm text-red-600">{exportError}</p>}
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-[28px] border border-slate-100 bg-white/95 px-6 py-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-blue-900">
              <ScanLine className="h-5 w-5" /> ขั้นตอนถัดไป
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              บาร์โค้ดที่สแกน: <span className="font-mono">{pendingBarcode || "ไม่ระบุ"}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-600">
              <p className="font-semibold text-blue-900">1. ตรวจสอบตัวตน</p>
              <p>กรอกรหัสนักเรียนเพื่อให้ระบบเพิ่มคะแนน และบันทึกว่าร่วมกิจกรรมห้องสมุดเคลื่อนที่</p>
            </div>
            <div>
              <Label htmlFor="student-code">รหัสนักเรียน</Label>
              <Input
                id="student-code"
                value={studentCode}
                onChange={(event) => setStudentCode(event.target.value)}
                placeholder="เช่น 12345"
                className="h-12 text-lg"
              />
            </div>
            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
             <DialogFooter className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => void handleConfirmReward()}
                disabled={submitting}
                className="flex-1 bg-blue-600 text-base text-white hover:bg-blue-700"
              >
                <Gift className="mr-2 h-4 w-4" />
                {submitting ? "กำลังบันทึก..." : "บันทึกและให้คะแนน +5"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
