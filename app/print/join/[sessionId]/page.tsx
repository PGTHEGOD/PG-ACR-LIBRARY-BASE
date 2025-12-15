"use client"

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, CheckCircle2, Clock, Loader2, Smartphone, UploadCloud } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

interface PageProps {
  params: Promise<{ sessionId: string }>
}

interface SessionFile {
  id: string
  name: string
  size: number
  uploadedAt: number
}

interface SessionView {
  id: string
  expiresAt: number
  expired: boolean
  used: boolean
  files?: SessionFile[]
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

export default function LibraryPrintJoinPage({ params }: PageProps) {
  const { sessionId } = use(params)
  const [sessionInfo, setSessionInfo] = useState<SessionView | null>(null)
  const [sessionError, setSessionError] = useState("")
  const [checking, setChecking] = useState(true)
  const [sessionTerminated, setSessionTerminated] = useState(false)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState("เลือกไฟล์ที่ต้องการพิมพ์")
  const [completed, setCompleted] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const xhrRef = useRef<XMLHttpRequest | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const cleanupUpload = useCallback(() => {
    xhrRef.current?.abort()
    xhrRef.current = null
    setUploading(false)
  }, [])

  useEffect(() => {
    return () => cleanupUpload()
  }, [cleanupUpload])

  const fetchSession = useCallback(
    async (showError = true) => {
      try {
        const response = await fetch(`/api/print-sessions/${sessionId}`, {
          cache: "no-store",
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          if (response.status === 404 || response.status === 410) {
            setSessionTerminated(true)
            setStatusMessage("QR หมดอายุหรือถูกปิดการเชื่อมต่อแล้ว")
            if (showError) {
              setSessionError("QR นี้หมดอายุหรือถูกปิดแล้ว กรุณาขอ QR ใหม่")
            }
            return null
          }
          throw new Error(payload.error || "ไม่พบ QR นี้")
        }
        setSessionInfo(payload as SessionView)
        setSessionTerminated(false)
        setSessionError("")
        return payload as SessionView
      } catch (error) {
        if (showError) {
          setSessionError((error as Error).message || "ไม่สามารถตรวจสอบ QR ได้")
        }
        return null
      } finally {
        setChecking(false)
      }
    },
    [sessionId],
  )

  const sessionExpired = useMemo(() => {
    if (sessionInfo?.expired) return true
    if (!sessionInfo) return false
    return sessionInfo.expiresAt <= now || sessionInfo.used
  }, [now, sessionInfo])
  const effectiveExpired = sessionExpired || sessionTerminated

  const countdown = useMemo(() => {
    if (!sessionInfo) return ""
    const ms = Math.max(0, sessionInfo.expiresAt - now)
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }, [now, sessionInfo])

  useEffect(() => {
    fetchSession(true)
  }, [fetchSession])

  useEffect(() => {
    if (!sessionInfo || effectiveExpired) return
    const interval = setInterval(() => {
      fetchSession(false)
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchSession, effectiveExpired, sessionInfo?.id])

  const handleSendFile = async () => {
    if (!selectedFile) {
      setSessionError("กรุณาเลือกไฟล์ก่อน")
      return
    }
    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      setSessionError("ไฟล์ใหญ่เกินกำหนด (สูงสุด 25 MB)")
      return
    }
    const snapshot = await fetchSession(true)
    if (!snapshot) return
    if (snapshot.expired || snapshot.used || sessionExpired) {
      setSessionError("QR นี้หมดอายุแล้ว กรุณาขอ QR ใหม่")
      return
    }

    const formData = new FormData()
    formData.append("file", selectedFile)

    cleanupUpload()
    setUploading(true)
    setCompleted(false)
    setProgress(0)
    setStatusMessage(`กำลังอัปโหลดไฟล์ ${selectedFile.name}...`)
    setSessionError("")

    const xhr = new XMLHttpRequest()
    xhrRef.current = xhr
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentage = (event.loaded / event.total) * 100
        setProgress(Math.min(100, percentage))
      }
    }
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) return
      setUploading(false)
      let payload: Record<string, unknown> = {}
      try {
        payload = JSON.parse(xhr.responseText || "{}")
      } catch {
        payload = {}
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        setProgress(100)
        setCompleted(true)
        setStatusMessage("ส่งไฟล์เรียบร้อย! คุณสามารถเลือกไฟล์อื่นเพื่อส่งต่อได้")
        setSelectedFile(null)
        fetchSession(false)
      } else {
        setProgress(0)
        setSessionError((payload.error as string) || "ส่งไฟล์ไม่สำเร็จ")
      }
    }
    xhr.onerror = () => {
      setUploading(false)
      setProgress(0)
      setSessionError("การอัปโหลดล้มเหลว กรุณาลองใหม่")
    }

    xhr.open("POST", `/api/print-sessions/${sessionId}/upload`)
    xhr.send(formData)
  }

  const files = sessionInfo?.files ?? []
  const disabled = uploading || effectiveExpired || !selectedFile || !sessionInfo
  const footer = (
    <p className="text-center text-xs text-slate-400">
      © {new Date().getFullYear()} Assumption College Rayong Library · Dev. by{" "}
      <a
        href="https://github.com/PGTHEGOD"
        target="_blank"
        rel="noreferrer"
        className="text-blue-700 underline underline-offset-2"
      >
        Park AKA PG Dev.
      </a>
    </p>
  )

  if (!checking && effectiveExpired) {
    return (
      <main className="flex flex-col min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
        <div className="w-full max-w-sm rounded-3xl border border-dashed border-slate-200 bg-white/80 p-6 text-center shadow-lg">
          <AlertCircle className="mx-auto mb-3 size-8 text-rose-600" />
          <p className="text-2xl font-semibold text-slate-900">QR หมดอายุแล้ว</p>
          <p className="mt-2 text-sm text-slate-500">
            QR ที่คุณสแกนถูกปิดหรือหมดเวลาการใช้งาน กรุณาสร้าง QR ใหม่อีกครั้ง
          </p>
          <Button
            className="mt-6 w-full"
            variant="secondary"
            onClick={() => window.location.reload()}
          >
            สแกน QR ใหม่
          </Button>
        </div>
        <div className="mt-6 w-full max-w-sm">
          {footer}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white px-4 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <section className="rounded-3xl border border-blue-100 bg-white/90 p-6 text-center shadow-sm md:p-8">
          <Badge variant="secondary" className="rounded-full bg-blue-100 text-blue-700">
            Library Print System
          </Badge>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">ส่งไฟล์ขึ้นเครื่องพิมพ์ห้องสมุด</h1>
          <p className="mt-2 text-sm text-slate-600">
            สแกน QR แล้วเลือกไฟล์จากโทรศัพท์ของคุณ สามารถส่งได้หลายไฟล์ภายใน 10 นาที
          </p>
        </section>

        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Smartphone className="size-5 text-primary" />
              สถานะ QR
            </CardTitle>
            <CardDescription className="text-slate-500">Session ID: {sessionId.slice(0, 8)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                <AlertCircle className="size-4" />
                {sessionError}
              </div>
            )}
            {checking ? (
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 className="size-4 animate-spin text-primary" />
                ตรวจสอบ QR...
              </div>
            ) : sessionInfo ? (
              <>
                <div className="flex flex-wrap gap-3">
                  <Badge className="bg-blue-100 text-blue-700">
                    <Clock className="mr-1 size-3.5" />
                    หมดอายุใน {countdown}
                  </Badge>
                  {sessionInfo.used && <Badge className="bg-amber-100 text-amber-700">QR นี้ถูกปิดแล้ว</Badge>}
                </div>
                {sessionExpired && (
                  <p className="text-sm text-red-500">QR นี้หมดอายุแล้ว กรุณาขอ QR ใหม่จากเจ้าหน้าที่</p>
                )}
                {!sessionExpired && (
                  <p className="text-sm text-slate-600">
                    คุณสามารถส่งไฟล์ได้ {MAX_UPLOAD_BYTES / (1024 * 1024)} MB ต่อไฟล์ และส่งได้หลายไฟล์จนกว่าเจ้าหน้าที่จะปิดการเชื่อมต่อ
                  </p>
                )}
                {files.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">ไฟล์ที่ส่งแล้ว</p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-600">
                      {files.map((file) => (
                        <li key={file.id}>
                          • {file.name} — {formatBytes(file.size)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-600">ไม่พบ QR นี้ กรุณากลับไปสแกนใหม่</p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">เลือกไฟล์เพื่อส่ง</CardTitle>
            <CardDescription className="text-slate-500">
              รองรับไฟล์ PDF / DOC / DOCX / รูปภาพและไฟล์ทั่วไป ขนาดไม่เกิน 25 MB
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">ไฟล์งาน</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.doc,.docx,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] || null)
                  setCompleted(false)
                  setProgress(0)
                  setStatusMessage("เลือกไฟล์ที่ต้องการพิมพ์")
                  setSessionError("")
                }}
                disabled={uploading || sessionExpired}
              />
            </div>
            {selectedFile && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium text-slate-900">{selectedFile.name}</p>
                <p className="text-slate-500">{formatBytes(selectedFile.size)}</p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">สถานะ</p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                {statusMessage}
              </div>
            </div>

            {(uploading || progress > 0) && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-slate-500">{Math.round(progress)}%</p>
              </div>
            )}

            {completed && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <CheckCircle2 className="size-4" />
                ส่งไฟล์สำเร็จ! คุณสามารถเลือกไฟล์อื่นและกดส่งอีกครั้งได้
              </div>
            )}

            <Button className="w-full" disabled={disabled} onClick={handleSendFile}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  กำลังส่ง...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 size-4" />
                  ส่งไฟล์ไปยังเครื่องพิมพ์
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="mt-auto">{footer}</div>
      </div>
    </main>
  )
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(1)} ${units[exponent]}`
}
