"use client"

import { useState, Suspense, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Library, User, Lock, ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const formSchema = z.object({
    studentCode: z.string().min(1, "กรุณากรอกรหัสนักเรียน"),
    password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
})

function LoginForm() {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const verified = searchParams.get("verified")

    useEffect(() => {
        if (verified === "true") {
            toast.success("ยืนยันตัวตนสำเร็จ", {
                description: "คุณสามารถเข้าสู่ระบบได้แล้ว",
            })
        }
    }, [verified])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            studentCode: "",
            password: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ")
            }

            toast.success("เข้าสู่ระบบสำเร็จ")
            router.push("/student/dashboard")
            router.refresh()
        } catch (error) {
            toast.error("เข้าสู่ระบบไม่สำเร็จ", {
                description: (error as Error).message,
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-lg"
        >
            <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl md:p-12">
                {/* Decorative elements inside card */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="mb-8 relative h-32 w-32 drop-shadow-2xl">
                        <Image
                            src="/assumption-rayoung.png"
                            alt="ACR Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>

                    <h1 className="mb-2 text-3xl font-bold tracking-tight text-white drop-shadow-sm">
                        เข้าสู่ระบบ
                    </h1>
                    <p className="mb-8 text-slate-300">
                        ระบบห้องสมุดดิจิทัล โรงเรียนอัสสัมชัญระยอง
                    </p>

                    {verified === "true" && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            className="mb-6 w-full"
                        >
                            <Alert className="bg-green-500/20 border-green-500/30 text-green-200">
                                <Sparkles className="h-4 w-4 text-green-400" />
                                <AlertTitle className="text-green-300 font-semibold ml-2">ยืนยันเรียบร้อย</AlertTitle>
                                <AlertDescription className="ml-6 text-green-100/80">บัญชีพร้อมใช้งานแล้ว</AlertDescription>
                            </Alert>
                        </motion.div>
                    )}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-5">
                            <FormField
                                control={form.control}
                                name="studentCode"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5 text-left">
                                        <FormLabel className="text-sm font-medium text-slate-300 ml-1">รหัสนักเรียน</FormLabel>
                                        <FormControl>
                                            <div className="relative group">
                                                <User className="absolute left-3 top-3 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-blue-400" />
                                                <Input
                                                    placeholder="เลขประจำตัวนักเรียน"
                                                    {...field}
                                                    className="h-12 border-white/10 bg-black/20 pl-10 text-white placeholder:text-slate-500 hover:bg-black/30 focus:border-blue-500/50 focus:bg-black/30 focus:ring-blue-500/20 transition-all rounded-xl"
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage className="text-red-300 ml-1" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5 text-left">
                                        <FormLabel className="text-sm font-medium text-slate-300 ml-1">รหัสผ่าน</FormLabel>
                                        <FormControl>
                                            <div className="relative group">
                                                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-blue-400" />
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    {...field}
                                                    className="h-12 border-white/10 bg-black/20 pl-10 text-white placeholder:text-slate-500 hover:bg-black/30 focus:border-blue-500/50 focus:bg-black/30 focus:ring-blue-500/20 transition-all rounded-xl"
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage className="text-red-300 ml-1" />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                className="group relative mt-2 h-12 w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-lg font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-blue-500/25 disabled:opacity-70"
                                disabled={isLoading}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                        <>
                                            เข้าสู่ระบบ <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                        </>
                                    )}
                                </span>
                                {/* Shimmer effect */}
                                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:animate-shimmer" />
                            </Button>
                        </form>
                    </Form>

                    <div className="mt-8 flex items-center gap-4 text-sm text-slate-400">
                        <span className="h-px w-12 bg-gradient-to-r from-transparent to-slate-600" />
                        <span>ยังไม่มีบัญชี?</span>
                        <span className="h-px w-12 bg-gradient-to-l from-transparent to-slate-600" />
                    </div>

                    <Button variant="ghost" className="mt-2 text-blue-300 hover:text-white hover:bg-white/5" asChild>
                        <Link href="/student/register">ลงทะเบียนใช้งาน</Link>
                    </Button>
                </div>
            </div>
        </motion.div>
    )
}

export default function LoginPage() {
    return (
        <div className="min-h-screen w-full bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black flex items-center justify-center p-4">
            {/* Background Ambient Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[100px]" />
            </div>

            <Suspense fallback={<div className="text-white">Loading...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    )
}
