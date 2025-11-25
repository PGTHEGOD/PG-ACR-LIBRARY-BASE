"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface StudentRegisterProps {
  studentId: string
  initialData?: {
    firstName?: string
    lastName?: string
    classRoom?: string | null
  }
  onComplete: () => void
}

export default function StudentRegister({ studentId, initialData, onComplete }: StudentRegisterProps) {
  const [firstName, setFirstName] = useState(initialData?.firstName || "")
  const [lastName, setLastName] = useState(initialData?.lastName || "")
  const [classRoom, setClassRoom] = useState(initialData?.classRoom || "")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setFirstName(initialData?.firstName || "")
    setLastName(initialData?.lastName || "")
    setClassRoom(initialData?.classRoom || "")
    setError("")
  }, [studentId, initialData])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      const [classLevel, room] = classRoom.split("/")
      const payload = [
        {
          studentCode: studentId,
          firstName,
          lastName,
          title: "",
          number: "",
          classLevel: classLevel?.trim() || "-",
          room: room?.trim() || "-",
        },
      ]
      const response = await fetch("/api/students/import?action=update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถบันทึกข้อมูลได้")
      }
      onComplete()
    } catch (err) {
      setError((err as Error).message || "ไม่สามารถบันทึกข้อมูลได้")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[200px] w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/80">
      <Card className="w-full max-w-md border-slate-200 shadow-sm">
        <CardHeader className="text-center">
          <CardTitle>บันทึกข้อมูลนักเรียนใหม่</CardTitle>
          <CardDescription>
            ไม่พบรหัส {studentId} ในระบบ กรุณากรอกข้อมูลเพื่อบันทึก ก่อนทำรายการยืม-คืน
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input placeholder="ชื่อ" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
            <Input placeholder="นามสกุล" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
            <Input placeholder="ชั้น/ห้อง (เช่น ม.4/3)" value={classRoom} onChange={(event) => setClassRoom(event.target.value)} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "กำลังบันทึก..." : "บันทึกข้อมูลนักเรียน"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
