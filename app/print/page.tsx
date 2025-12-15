"use client"

import type { ComponentProps, ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, Clock, FileDown, FileText, Loader2, Printer, QrCode, Smartphone, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SessionFile {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: number
  downloadedAt?: number | null
}

interface SessionInfo {
  id: string
  createdAt: number
  expiresAt: number
  used: boolean
  expired: boolean
  files?: SessionFile[]
}

type FileStatus = "idle" | "loading" | "ready" | "error"

export default function LibraryPrintHostPage() {
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const activeSessionIdRef = useRef<string | null>(null)

  const [sessionError, setSessionError] = useState("")
  const [sessionLoading, setSessionLoading] = useState(false)

  const fileUrlsRef = useRef<Record<string, string>>({})
  const [fileStatus, setFileStatus] = useState<Record<string, FileStatus>>({})
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [origin, setOrigin] = useState("")
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "")
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const cleanupFileUrls = useCallback(() => {
    Object.values(fileUrlsRef.current).forEach((url) => {
      URL.revokeObjectURL(url)
    })
    fileUrlsRef.current = {}
  }, [])

  const resetFileState = useCallback(() => {
    cleanupFileUrls()
    setFileStatus({})
    setSelectedFileId(null)
  }, [cleanupFileUrls])

  const fetchSession = useCallback(
    async (sessionId: string) => {
      try {
        const response = await fetch(`/api/print-sessions/${sessionId}`, { cache: "no-store" })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          if (response.status === 404 || response.status === 410) {
            setSession(null)
            setActiveSessionId(null)
            activeSessionIdRef.current = null
            resetFileState()
            setSessionError(
              response.status === 410 ? "เซสชันนี้หมดอายุแล้ว" : "เซสชันนี้ถูกปิดแล้ว",
            )
            return
          }
          throw new Error(payload.error || "ไม่สามารถตรวจสอบเซสชันได้")
        }
        const nextSession = payload as SessionInfo
        setSession(nextSession)
        setSessionError("")
        if (nextSession.expired) {
          resetFileState()
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
          setActiveSessionId(null)
          activeSessionIdRef.current = null
        }
      } catch (error) {
        setSessionError((error as Error).message || "ไม่สามารถตรวจสอบเซสชันได้")
      }
    },
    [resetFileState],
  )

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId
  }, [activeSessionId])

  const sendConsumeRequest = useCallback(async (sessionId: string | null) => {
    if (!sessionId) return
    try {
      await fetch(`/api/print-sessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "consume" }),
      })
    } catch (error) {
      console.error("finish session", error)
    }
  }, [])

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (!activeSessionId) return
    fetchSession(activeSessionId)
    pollRef.current = setInterval(() => {
      fetchSession(activeSessionId)
    }, 2000)
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [activeSessionId, fetchSession])

  useEffect(() => {
    if (!session?.files?.length) {
      setSelectedFileId(null)
      return
    }
    const exists = session.files.some((file) => file.id === selectedFileId)
    if (!exists) {
      setSelectedFileId(session.files[session.files.length - 1].id)
    }
  }, [session, selectedFileId])

  useEffect(() => {
    return () => {
      cleanupFileUrls()
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      const pendingSession = activeSessionIdRef.current
      activeSessionIdRef.current = null
      sendConsumeRequest(pendingSession)
    }
  }, [cleanupFileUrls, sendConsumeRequest])

  const sessionCountdown = useMemo(() => {
    if (!session) return ""
    const ms = Math.max(0, session.expiresAt - currentTime)
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }, [currentTime, session])

  const joinUrl = useMemo(() => {
    if (!session?.id || !origin) return ""
    return `${origin}/print/join/${session.id}`
  }, [origin, session])

  const qrUrl = useMemo(() => {
    if (!joinUrl) return ""
    return `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(joinUrl)}`
  }, [joinUrl])

  const selectedFile = useMemo(() => {
    if (!selectedFileId || !session?.files?.length) return null
    return session.files.find((file) => file.id === selectedFileId) ?? null
  }, [selectedFileId, session])

  const statusMessage = useMemo(() => {
    if (!session) return "ยังไม่มี QR สำหรับพิมพ์"
    if (session.expired) return "QR หมดอายุแล้ว กรุณาสร้างใหม่"
    const count = session.files?.length ?? 0
    if (count === 0) return "แสดง QR ให้ผู้ใช้สแกนและอัปโหลดไฟล์"
    return `ได้รับไฟล์แล้ว ${count} ไฟล์ เลือกเพื่อเปิดพิมพ์`
  }, [session])

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

  const fetchFileBlob = useCallback(
    async (file: SessionFile) => {
      if (!session?.id) return null
      if (fileUrlsRef.current[file.id]) {
        return fileUrlsRef.current[file.id]
      }
      setFileStatus((prev) => ({ ...prev, [file.id]: "loading" }))
      try {
        const response = await fetch(`/api/print-sessions/${session.id}/files/${file.id}`, {
          cache: "no-store",
        })
        if (!response.ok) {
          throw new Error("ไม่สามารถดาวน์โหลดไฟล์ได้")
        }
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        fileUrlsRef.current[file.id] = url
        setFileStatus((prev) => ({ ...prev, [file.id]: "ready" }))
        return url
      } catch (error) {
        setFileStatus((prev) => ({ ...prev, [file.id]: "error" }))
        throw error
      }
    },
    [session?.id],
  )

  const handleFinishSession = useCallback(async () => {
    const sessionToClose = activeSessionIdRef.current
    if (!sessionToClose) return
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    activeSessionIdRef.current = null
    setActiveSessionId(null)
    setSession(null)
    resetFileState()
    await sendConsumeRequest(sessionToClose)
  }, [resetFileState, sendConsumeRequest])

  const handleCreateSession = useCallback(async () => {
    setSessionError("")
    setSessionLoading(true)
    if (activeSessionIdRef.current) {
      await handleFinishSession()
    } else {
      resetFileState()
    }
    try {
      const response = await fetch("/api/print-sessions", {
        method: "POST",
        cache: "no-store",
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || "ไม่สามารถสร้าง QR ได้")
      }
      const nextSession: SessionInfo = {
        id: payload.id,
        createdAt: Date.now(),
        expiresAt: payload.expiresAt,
        used: false,
        expired: false,
        files: [],
      }
      setSession(nextSession)
      setActiveSessionId(payload.id)
      activeSessionIdRef.current = payload.id
    } catch (error) {
      console.error("create session", error)
      setSessionError((error as Error).message || "ไม่สามารถสร้าง QR ได้")
    } finally {
      setSessionLoading(false)
    }
  }, [handleFinishSession, resetFileState])

  const handleOpenFile = useCallback(
    async (mode: "preview" | "download") => {
      if (!selectedFile) return
      try {
        const url = await fetchFileBlob(selectedFile)
        if (!url) throw new Error("ไม่พบไฟล์")
        if (mode === "download") {
          const anchor = document.createElement("a")
          anchor.href = url
          anchor.download = selectedFile.name || "library-print-file"
          document.body.appendChild(anchor)
          anchor.click()
          document.body.removeChild(anchor)
          return
        }
        const printWindow = window.open("", "_blank")
        if (!printWindow) return
        if (selectedFile.type === "application/pdf" || selectedFile.type.startsWith("image/")) {
          printWindow.document.write(`
            <html>
              <head><title>Print ${selectedFile.name}</title></head>
              <body style="margin:0">
                <iframe src="${url}" style="border:0;width:100%;height:100vh;"></iframe>
                <script>
                  const frame = document.querySelector('iframe');
                  frame?.addEventListener('load', () => {
                    try {
                      frame.contentWindow.focus();
                      frame.contentWindow.print();
                    } catch (error) {
                      console.error(error);
                    }
                  });
                </script>
              </body>
            </html>
          `)
        } else {
          printWindow.document.write(`
            <html>
              <head><title>Download ${selectedFile.name}</title></head>
              <body style="font-family: sans-serif; padding: 24px;">
                <p>ไฟล์นี้ไม่รองรับการแสดงผลเพื่อพิมพ์โดยตรง กรุณาดาวน์โหลดแล้วเปิดในโปรแกรมที่รองรับก่อนสั่งพิมพ์</p>
                <p><a href="${url}" download="${selectedFile.name}">ดาวน์โหลด ${selectedFile.name}</a></p>
                <script>
                  window.onload = () => {
                    window.location.href = "${url}";
                  };
                </script>
              </body>
            </html>
          `)
        }
      } catch (error) {
        setSessionError((error as Error).message || "ไม่สามารถเปิดไฟล์ได้")
      }
    },
    [fetchFileBlob, selectedFile],
  )

  const files = session?.files ?? []
  const selectedStatus = selectedFile
    ? fileStatus[selectedFile.id] ?? (selectedFile.downloadedAt ? "ready" : "idle")
    : "idle"

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-amber-50 via-white to-white px-4 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8">
        <section className="rounded-3xl border border-amber-100 bg-white/80 p-6 shadow-sm md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl space-y-3">
              <Badge variant="secondary" className="rounded-full bg-amber-100 text-amber-700">
                Library Print System
              </Badge>
              <div>
                <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
                  ส่งไฟล์จากมือถือได้หลากไฟล์ใน QR เดียว
                </h1>
                <p className="mt-2 text-slate-600">
                  ระบบอัปโหลดผ่านเซิร์ฟเวอร์ Library-BASE ปลอดภัย จำกัดเวลาการใช้งาน 10 นาทีต่อ QR
                </p>
              </div>
              <div className="grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
                <InfoPill title="ขั้นตอนที่ 1" highlight="สร้าง QR สำหรับเครื่องนี้" />
                <InfoPill title="ขั้นตอนที่ 2" highlight="ให้นักเรียนอัปโหลดไฟล์" muted />
                <InfoPill title="ขั้นตอนที่ 3" highlight="เปิด Print Preview & สั่งพิมพ์" muted />
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/60 p-5 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="size-4 text-primary" />
                {session ? <span>QR หมดอายุใน {sessionCountdown}</span> : <span>ยังไม่มี QR ที่สร้างไว้</span>}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Printer className="size-4 text-primary" />
                <span>{statusMessage}</span>
              </div>
              {session && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500">
                  Session ID: {session.id.slice(0, 12)}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <QrCode className="size-5 text-primary" />
                  สร้าง QR สำหรับเครื่องนี้
                </CardTitle>
                <CardDescription className="text-slate-500">
                  QR มีอายุ 10 นาที ใช้สำหรับรับหลายไฟล์จนกว่าจะปิด
                </CardDescription>
              </div>
              <Button onClick={handleCreateSession} disabled={sessionLoading} size="lg">
                {sessionLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    กำลังสร้าง...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 size-4" />
                    สร้าง QR ใหม่
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {sessionError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                  <AlertCircle className="size-4" />
                  {sessionError}
                </div>
              )}

              {session && joinUrl ? (
                <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                    {qrUrl ? (
                      <img
                        src={qrUrl}
                        alt="Session QR"
                        className="mx-auto max-h-[240px] rounded-xl border border-white bg-white p-4 shadow-sm"
                      />
                    ) : (
                      <div className="flex h-[240px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-sm text-slate-500">
                        กำลังสร้าง QR...
                      </div>
                    )}
                    <p className="mt-3 text-xs text-slate-500">หมดอายุใน {sessionCountdown}</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700">ลิงก์สำหรับมือถือ</p>
                      <div className="mt-2 break-all rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-600">
                        {joinUrl}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                      <p className="font-medium text-slate-800">วิธีใช้งาน</p>
                      <ol className="mt-2 space-y-1">
                        <li>1. เปิดหน้านี้บนเครื่องที่ต่อกับเครื่องพิมพ์</li>
                        <li>2. ให้นักเรียนสแกน QR และอัปโหลดหลายไฟล์ได้ตามต้องการ</li>
                        <li>3. เลือกไฟล์จากรายการด้านขวาเพื่อเปิด Print Preview หรือดาวน์โหลด</li>
                      </ol>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                  <Smartphone className="mx-auto mb-4 size-12 text-slate-400" />
                  <p className="text-lg font-semibold text-slate-800">ยังไม่มี QR</p>
                  <p className="text-sm text-slate-500">กด “สร้าง QR ใหม่” เพื่อเริ่มรับไฟล์จากผู้ใช้</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Printer className="size-5 text-primary" />
                รายการไฟล์ที่ส่งเข้ามา
              </CardTitle>
              <CardDescription className="text-slate-500">
                เลือกไฟล์เพื่อเปิด Print Preview หรือดาวน์โหลด
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {files.length ? (
                <div className="space-y-3">
                  {files.map((file) => {
                    const status = fileStatus[file.id] ?? (file.downloadedAt ? "ready" : "idle")
                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => setSelectedFileId(file.id)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left ${
                          selectedFileId === file.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-slate-200 bg-slate-50 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{file.name}</p>
                            <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                          </div>
                          <Badge
                            className={
                              selectedFileId === file.id
                                ? "bg-primary text-white"
                                : "bg-slate-200 text-slate-700"
                            }
                          >
                            {status === "ready"
                              ? "พร้อมแล้ว"
                              : status === "loading"
                                ? "กำลังดาวน์โหลด"
                                : status === "error"
                                  ? "โหลดไม่สำเร็จ"
                                  : "รอเปิด"}
                          </Badge>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                  ยังไม่มีไฟล์เข้ามา
                </div>
              )}

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-base font-semibold text-slate-900">การจัดการไฟล์ที่เลือก</h3>
                <p className="text-sm text-slate-600">
                  เลือกไฟล์จากรายการด้านบน จากนั้นกดปุ่มเพื่อเปิด Print Preview หรือดาวน์โหลด
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button className="flex-1 min-w-[160px]" disabled={!selectedFile} onClick={() => handleOpenFile("preview")}>
                    <Printer className="mr-2 size-4" />
                    เปิด Print Preview
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 min-w-[160px]"
                    disabled={!selectedFile}
                    onClick={() => handleOpenFile("download")}
                  >
                    <FileDown className="mr-2 size-4" />
                    ดาวน์โหลดไฟล์
                  </Button>
                </div>
                {!selectedFile && <p className="text-xs text-slate-500">ยังไม่มีไฟล์ที่เลือก</p>}
                {selectedFile && selectedStatus === "loading" && (
                  <p className="text-xs text-slate-500">กำลังดาวน์โหลดไฟล์จากเซิร์ฟเวอร์...</p>
                )}
                {selectedFile && selectedStatus === "error" && (
                  <p className="text-xs text-red-500">ดาวน์โหลดไม่สำเร็จ กดอีกครั้งเพื่อพยายามใหม่</p>
                )}
              </div>

              {session && (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p>เมื่อพิมพ์งานเสร็จแล้วให้กดปุ่มด้านล่างเพื่อปิดการเชื่อมต่อและลบไฟล์ออกจากเซิร์ฟเวอร์</p>
                  <Button onClick={handleFinishSession} className="w-full">
                    ปิดการเชื่อมต่อเมื่อพิมพ์เสร็จ
                  </Button>
                  <p className="text-xs text-amber-700">
                    กรุณารอให้หน้าต่างพิมพ์หรือดาวน์โหลดเปิดเสร็จ สิ้นสุดการรับไฟล์ก่อนปิดหน้าเว็บ
                  </p>
                  <p className="text-xs text-amber-700">
                    หากปิดหน้าต่างนี้โดยไม่กดปุ่ม ระบบจะถือว่า QR หมดอายุและไฟล์จะถูกลบทันที
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* <section className="grid gap-4 md:grid-cols-3">
          <InfoCard
            title="อัปโหลดผ่านเซิร์ฟเวอร์"
            description="ไฟล์ถูกส่งไปเก็บไว้ชั่วคราวบน Library-BASE ก่อนดาวน์โหลดลงเครื่องนี้"
            icon={<Smartphone className="size-5 text-primary" />}
          />
          <InfoCard
            title="รองรับไฟล์หลากหลาย"
            description="PDF, DOCX หรือไฟล์รูปภาพก็เตรียมพิมพ์ได้ทันที"
            icon={<FileText className="size-5 text-primary" />}
          />
          <InfoCard
            title="ควบคุมการใช้งาน"
            description="QR ใช้ได้ระหว่างที่หน้านี้เปิดอยู่เท่านั้น ปิดแล้วถือว่าหมดอายุทันที"
            icon={<ShieldIcon className="size-5 text-primary" />}
          />
        </section> */}
        <div className="mt-auto">{footer}</div>
      </div>
    </main>
  )
}

function InfoPill({ title, highlight, muted }: { title: string; highlight: string; muted?: boolean }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        muted ? "border-slate-200 bg-slate-50 text-slate-700" : "border-amber-100 bg-amber-50 text-amber-900"
      }`}
    >
      <p className={`text-xs uppercase tracking-wide ${muted ? "text-slate-500" : "text-amber-800"}`}>{title}</p>
      <p className="text-sm font-medium">{highlight}</p>
    </div>
  )
}

function InfoCard({ title, description, icon }: { title: string; description: string; icon: ReactNode }) {
  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <div className="rounded-full bg-primary/10 p-2 text-primary">{icon}</div>
        <div>
          <CardTitle className="text-base text-slate-900">{title}</CardTitle>
          <CardDescription className="text-slate-500">{description}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  )
}

function ShieldIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" {...props}>
      <path
        d="M12 3L5 6V11C5 15.55 7.84 19.74 12 21C16.16 19.74 19 15.55 19 11V6L12 3Z"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12L11 14L15 10"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(1)} ${units[exponent]}`
}
