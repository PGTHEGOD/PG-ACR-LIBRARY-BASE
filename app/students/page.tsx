"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { StudentRecord } from "@/lib/types"
import StudentRegister from "@/components/student-register"

interface ScoreLeaderEntry {
  studentCode: string
  firstName: string
  lastName: string
  classLevel: string
  totalPoints: number
}

interface ScoreLeaderGroup {
  primary: ScoreLeaderEntry[]
  secondary: ScoreLeaderEntry[]
}

interface ScoreLeaderSummary {
  monthly: ScoreLeaderGroup
  overall: ScoreLeaderGroup
}

const createEmptyLeaderSummary = (): ScoreLeaderSummary => ({
  monthly: { primary: [], secondary: [] },
  overall: { primary: [], secondary: [] },
})

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState("__all__")
  const [classChoices, setClassChoices] = useState<Array<{ classLevel: string; room: string | null }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<StudentRecord | null>(null)
  const [formMessage, setFormMessage] = useState("")
  const [jsonPayload, setJsonPayload] = useState(
    '[{"studentCode":"644512","classLevel":"ม.4","room":"3","number":"12","title":"เด็กชาย","firstName":"ตัวอย่าง","lastName":"นักเรียน"}]'
  )
  const [importStatus, setImportStatus] = useState("")
  const [importError, setImportError] = useState("")
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [leaders, setLeaders] = useState<ScoreLeaderSummary>(() => createEmptyLeaderSummary())
  const defaultMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  }, [])
  const [leaderMonth, setLeaderMonth] = useState(defaultMonth)

  const loadStudents = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("search", search.trim())
      if (classFilter && classFilter !== "__all__") params.set("class", classFilter)
      if (leaderMonth) params.set("leaderMonth", leaderMonth)
      const response = await fetch(`/api/students?${params.toString()}`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || "ไม่สามารถโหลดรายชื่อได้")
      }
      const list: StudentRecord[] = payload.students || []
      const sorted = list.slice().sort((a, b) => {
        const levelCompare = a.classLevel.localeCompare(b.classLevel, "th", { numeric: true })
        if (levelCompare !== 0) return levelCompare
        const roomCompare = (a.room || "").localeCompare(b.room || "", "th", { numeric: true })
        if (roomCompare !== 0) return roomCompare
        const numA = Number(a.number || 0)
        const numB = Number(b.number || 0)
        if (Number.isFinite(numA) && Number.isFinite(numB)) {
          return numA - numB
        }
        return (a.number || "").localeCompare(b.number || "", "th", { numeric: true })
      })
      setStudents(sorted)
      setLeaders(payload.leaders || createEmptyLeaderSummary())
    } catch (err) {
      setError((err as Error).message || "ไม่สามารถโหลดรายชื่อได้")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStudents()
  }, [classFilter, leaderMonth, search])

  useEffect(() => {
    const fetchClasses = async () => {
      const response = await fetch("/api/classes")
      const payload = await response.json().catch(() => ({ classes: [] }))
      if (response.ok) {
        setClassChoices(payload.classes || [])
      }
    }
    fetchClasses()
  }, [])

  const handleSelect = (student: StudentRecord) => {
    setSelected(student)
    setFormMessage("")
  }

  const handleUpdateComplete = () => {
    setFormMessage("อัปเดตข้อมูลเรียบร้อย")
    loadStudents()
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return students
    const term = search.trim().toLowerCase()
    return students.filter((student) =>
      [student.studentCode, student.firstName, student.lastName, student.classLevel, student.room]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term))
    )
  }, [students, search])

  const renderLeaderGroup = (title: string, entries: ScoreLeaderEntry[]) => (
    <div className="rounded-xl border border-white/70 bg-white/80 p-3">
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      {entries.length ? (
        <ol className="mt-2 space-y-2 text-sm">
          {entries.map((entry, index) => (
            <li key={entry.studentCode} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">{index + 1}.</span>
                <div>
                  <p className="font-semibold text-slate-900">
                    {entry.firstName} {entry.lastName}
                  </p>
                  <p className="text-xs text-slate-500">{entry.classLevel}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-blue-600">{entry.totalPoints.toLocaleString()} คะแนน</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-xs text-slate-400">ยังไม่มีข้อมูล</p>
      )}
    </div>
  )

  const renderLeaderPanel = (title: string, description: string, group: ScoreLeaderGroup) => (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="text-xs text-slate-500">{description}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {renderLeaderGroup("ป.1 - ป.6", group.primary)}
        {renderLeaderGroup("ม.1 - ม.6", group.secondary)}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 bg-white px-4 py-4">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-blue-50">
              <Image src="/assumption-rayoung.png" alt="Assumption College Rayong" fill className="object-contain p-2" priority />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-blue-700">Assumption College Rayong</p>
              <p className="text-lg font-semibold text-slate-900">จัดการข้อมูลนักเรียน</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="link" className="text-blue-700">
                ← กลับไปหน้าหลัก
              </Button>
            </Link>
            <Badge variant="outline">Student Management</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
        <Card className="rounded-3xl border border-blue-100 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-blue-900">อันดับคะแนน Library Points</CardTitle>
                <p className="text-sm text-slate-500">
                  เลือกเดือนเพื่อตรวจสอบ Top 3 ของระดับชั้น ป.1-ป.6 และ ม.1-ม.6
                </p>
              </div>
              <div className="flex flex-col gap-2 text-sm text-slate-600 md:text-right">
                <label className="text-xs uppercase tracking-[0.25em] text-slate-400">เลือกเดือน</label>
                <Input
                  type="month"
                  value={leaderMonth}
                  onChange={(event) => setLeaderMonth(event.target.value)}
                  className="md:w-52"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            {renderLeaderPanel(
              "เดือนนี้",
              "นับเฉพาะคะแนน Library Points ที่ได้รับในเดือนที่เลือก",
              leaders.monthly
            )}
            {renderLeaderPanel("สถิติตลอดเวลา", "คะแนนสะสมทั้งหมด (รวมทุกเดือนจนถึงปัจจุบัน)", leaders.overall)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-blue-900">รายชื่อนักเรียน</CardTitle>
            <div className="flex gap-2">
              <Input placeholder="ค้นหาชื่อหรือรหัส" value={search} onChange={(event) => setSearch(event.target.value)} />
              <select
                className="rounded-lg border border-slate-200 px-3 text-sm"
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
              >
                <option value="__all__">ทุกชั้น</option>
                {classChoices.map((choice) => (
                  <option key={`${choice.classLevel}|${choice.room || ""}`} value={`${choice.classLevel}|${choice.room || ""}`}>
                    {choice.classLevel}
                    {choice.room ? `/${choice.room}` : ""}
                  </option>
                ))}
              </select>
              <Button onClick={loadStudents} disabled={loading}>
                {loading ? "กำลังโหลด..." : "ค้นหา"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัส</TableHead>
                    <TableHead>ชื่อ-นามสกุล</TableHead>
                    <TableHead>ห้อง</TableHead>
                    <TableHead>คะแนน</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((student) => (
                    <TableRow key={student.studentCode}>
                      <TableCell className="font-semibold">{student.studentCode}</TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-900">
                          {student.title ? `${student.title} ` : ""}
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-slate-500">
                          เลขที่ {student.number || "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        {student.classLevel}
                        {student.room ? `/${student.room}` : ""}
                      </TableCell>
                      <TableCell className="font-semibold text-blue-700">
                        {(student.totalPoints ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleSelect(student)}>
                          จัดการ
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-900">
                อัปเดตข้อมูล {selected.firstName} {selected.lastName} ({selected.studentCode})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formMessage && <p className="text-sm text-emerald-600">{formMessage}</p>}
              <StudentRegister
                studentId={selected.studentCode}
                initialData={{
                  firstName: selected.firstName,
                  lastName: selected.lastName,
                  classRoom: selected.room ? `${selected.classLevel}/${selected.room}` : selected.classLevel,
                }}
                onComplete={handleUpdateComplete}
              />
            </CardContent>
          </Card>
        )}
      </main>

      <section className="mx-auto w-full max-w-6xl px-4 pb-8">
      <Card className="rounded-2xl border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-blue-900">นำเข้ารายชื่อนักเรียน</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              ระบบนี้ไม่รองรับการนำเข้ารายชื่อนักเรียนโดยตรง
            </p>
            <p className="text-sm text-amber-700 mt-1">
              กรุณาใช้ “ระบบลงทะเบียนเข้าใข้ห้องสมุด” สำหรับเพิ่ม/นำเข้ารายชื่อทั้งหมด
            </p>
            <p className="text-xs text-amber-600 mt-2">
              หลังนำเข้าที่ระบบลงทะเบียน ข้อมูลจะถูกซิงค์อัตโนมัติเข้าสู่ระบบห้องสมุด
            </p>

            {/* <Link href="https://acr-register-system.example.com" target="_blank">
              <Button className="mt-4 bg-blue-600 text-white hover:bg-blue-700">
                เปิดระบบลงทะเบียนนักเรียน
              </Button>
            </Link> */}
          </div>
        </CardContent>
      </Card>
    </section>

    </div>
  )
}
