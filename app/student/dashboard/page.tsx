import { redirect } from "next/navigation"
import { getCurrentStudent } from "@/lib/server/session"
import { getStudentProfile } from "@/lib/server/library-service"
import Link from "next/link"
import Image from "next/image"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import ClientDashboard from "./client-dashboard"
import { BookOpen, History, Award, LogOut, UserCircle, Crown, Search, Settings, Sparkles } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
    const session = await getCurrentStudent()

    if (!session) {
        redirect("/student/login")
    }

    const profile = await getStudentProfile(session.sub) // sub is studentCode/student_id

    if (!profile) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0f172a] text-white">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold text-red-400">ไม่พบข้อมูลนักเรียน</h1>
                    <p className="text-slate-400">กรุณาติดต่อเจ้าหน้าที่ห้องสมุด</p>
                    <Link href="/student/login" className="text-blue-400 hover:underline">กลับไปหน้าเข้าสู่ระบบ</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen w-full bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black">
            {/* Background Ambient Effects */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[120px]" />
                <div className="absolute top-[40%] left-[-20%] w-[60%] h-[60%] rounded-full bg-purple-600/5 blur-[120px]" />
            </div>

            {/* Header / Navbar */}
            <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0f172a]/80 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
                    <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10">
                            <Image src="/assumption-rayoung.png" alt="ACR Logo" fill className="object-contain" />
                        </div>
                        <span className="font-bold text-white hidden sm:inline-block tracking-tight text-lg">ACR <span className="text-blue-400">Library</span></span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-semibold text-white">{profile.student.firstName} {profile.student.lastName}</p>
                            <p className="text-xs text-slate-400 font-mono tracking-wide">{profile.student.studentCode}</p>
                        </div>
                        <div className="h-10 w-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
                            <UserCircle className="h-6 w-6 text-slate-300" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative z-10 mx-auto max-w-7xl p-4 md:p-8 space-y-8">
                {/* Welcome Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-800 p-8 md:p-12 shadow-2xl shadow-blue-900/20 text-white">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-100 mb-4 backdrop-blur-md border border-white/10">
                                <Sparkles className="h-3 w-3 text-yellow-300" />
                                <span>Welcome Back</span>
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight md:text-5xl mb-2">
                                สวัสดี, {profile.student.firstName} 👋
                            </h1>
                            <p className="text-blue-100/80 text-lg max-w-xl font-light">
                                สะสมคำแนนแลกของรางวัลไปด้วยกัน
                            </p>
                        </div>

                        <div className="flex items-center gap-4 rounded-2xl bg-black/20 p-4 backdrop-blur-sm border border-white/10">
                            <div className="rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 p-3 shadow-lg shadow-orange-500/20">
                                <Crown className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-yellow-100 uppercase tracking-wider">คะแนนสะสม</p>
                                <h3 className="text-3xl font-bold text-white">{profile.stats.points.toLocaleString()} <span className="text-sm font-normal text-yellow-200/70">คะแนน</span></h3>
                            </div>
                        </div>
                    </div>

                    {/* Abstract Background Shapes */}
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 h-96 w-96 rounded-full bg-white/10 blur-3xl mix-blend-overlay" />
                    <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl mix-blend-color-dodge" />
                </div>

                {/* Stats Grid */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-white/10 bg-white/5 backdrop-blur-md shadow-lg transition-all hover:bg-white/10 hover:-translate-y-1">
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="rounded-xl bg-blue-500/20 p-3 text-blue-400 ring-1 ring-blue-500/30">
                                <BookOpen className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">กำลังรอยืม</p>
                                <h3 className="text-2xl font-bold text-white">{profile.stats.activeLoans}</h3>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/5 backdrop-blur-md shadow-lg transition-all hover:bg-white/10 hover:-translate-y-1">
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="rounded-xl bg-green-500/20 p-3 text-green-400 ring-1 ring-green-500/30">
                                <History className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">ยืมทั้งหมด</p>
                                <h3 className="text-2xl font-bold text-white">{profile.stats.totalLoans}</h3>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Add more stats if needed, or keeping it clean */}
                </div>

                <div className="grid gap-8 lg:grid-cols-12 min-h-[600px]">
                    {/* Search Column (Main Focus) */}
                    <div className="lg:col-span-8 space-y-6">
                        <ClientDashboard initialBooks={[]} />
                    </div>

                    {/* History Column (Side) */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="rounded-3xl border border-white/10 bg-black/20 shadow-xl backdrop-blur-md overflow-hidden h-full">
                            <div className="bg-white/5 p-6 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                                        <History className="h-4 w-4" />
                                    </div>
                                    <h3 className="font-bold text-white text-lg">ประวัติล่าสุด</h3>
                                </div>
                            </div>
                            <div className="p-0">
                                <ScrollArea className="h-[600px] w-full">
                                    {profile.loans.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                            <History className="mb-4 h-12 w-12 opacity-20" />
                                            <p>ยังไม่มีประวัติการยืม</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-white/5">
                                            {profile.loans.map((loan) => (
                                                <div key={loan.id} className="flex flex-col gap-2 p-5 hover:bg-white/5 transition-colors group">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <span className="font-medium text-slate-200 line-clamp-2 text-sm leading-relaxed group-hover:text-blue-300 transition-colors">{loan.title}</span>
                                                        <Badge
                                                            variant="outline"
                                                            className={`shrink-0 border-0 bg-opacity-20 ${loan.status === "borrowed" ? "bg-amber-500 text-amber-400" : "bg-slate-700 text-slate-400"}`}
                                                        >
                                                            {loan.status === "borrowed" ? "กำลังยืม" : "คืนแล้ว"}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                                                            ยืม: {new Date(loan.borrowedAt).toLocaleDateString("th-TH")}
                                                        </span>
                                                        {loan.returnedAt && (
                                                            <span className="flex items-center gap-1">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
                                                                คืน: {new Date(loan.returnedAt).toLocaleDateString("th-TH")}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
