"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Library, CheckCircle, User, Lock, ArrowRight, ShieldCheck } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
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

const formSchema = z
    .object({
        studentCode: z.string().min(1, "กรุณากรอกรหัสนักเรียน"),
        password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
        confirmPassword: z.string().min(6, "กรุณายืนยันรหัสผ่าน"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "รหัสผ่านไม่ตรงกัน",
        path: ["confirmPassword"],
    })

export default function RegisterPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [emailSentTo, setEmailSentTo] = useState("")

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            studentCode: "",
            password: "",
            confirmPassword: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentCode: values.studentCode,
                    password: values.password,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "เกิดข้อผิดพลาดในการลงทะเบียน")
            }

            setEmailSentTo(`${values.studentCode}@acr.ac.th`)
            setIsSuccess(true)
            toast.success("ลงทะเบียนสำเร็จ")
        } catch (error) {
            toast.error("ลงทะเบียนไม่สำเร็จ", {
                description: (error as Error).message,
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black flex items-center justify-center p-4">
            {/* Background Ambient Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[100px]" />
            </div>

            <AnimatePresence mode="wait">
                {isSuccess ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key="success"
                        className="w-full max-w-lg"
                    >
                        <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl md:p-12 text-center">
                            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20">
                                <CheckCircle className="h-10 w-10" />
                            </div>
                            <h2 className="mb-2 text-3xl font-bold text-white">ลงทะเบียนสำเร็จ!</h2>
                            <p className="mb-6 text-slate-300">
                                กรุณาตรวจสอบอีเมลยืนยันที่ส่งไปยัง
                            </p>

                            <div className="mx-auto mb-8 max-w-sm rounded-xl border border-white/10 bg-black/20 p-4 font-mono text-sm text-blue-300">
                                {emailSentTo}
                            </div>

                            <Button
                                variant="default"
                                className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
                                asChild
                            >
                                <Link href="/student/login">เข้าสู่ระบบ</Link>
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        key="form"
                        className="w-full max-w-lg"
                    >
                        <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl md:p-12">
                            {/* Decorative elements */}
                            <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
                            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

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
                                    ลงทะเบียนนักเรียน
                                </h1>
                                <p className="mb-8 text-slate-300">
                                    สร้างบัญชีเพื่อเข้าถึงบริการห้องสมุด
                                </p>

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
                                                            <User className="absolute left-3 top-3 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-indigo-400" />
                                                            <Input
                                                                placeholder="เลขประจำตัวนักเรียน"
                                                                {...field}
                                                                className="h-12 border-white/10 bg-black/20 pl-10 text-white placeholder:text-slate-500 hover:bg-black/30 focus:border-indigo-500/50 focus:bg-black/30 focus:ring-indigo-500/20 transition-all rounded-xl"
                                                            />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage className="text-red-300 ml-1" />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="grid gap-5 md:grid-cols-2">
                                            <FormField
                                                control={form.control}
                                                name="password"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-1.5 text-left">
                                                        <FormLabel className="text-sm font-medium text-slate-300 ml-1">รหัสผ่าน</FormLabel>
                                                        <FormControl>
                                                            <div className="relative group">
                                                                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-indigo-400" />
                                                                <Input
                                                                    type="password"
                                                                    placeholder="••••••••"
                                                                    {...field}
                                                                    className="h-12 border-white/10 bg-black/20 pl-10 text-white placeholder:text-slate-500 hover:bg-black/30 focus:border-indigo-500/50 focus:bg-black/30 focus:ring-indigo-500/20 transition-all rounded-xl"
                                                                />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage className="text-red-300 ml-1" />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="confirmPassword"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-1.5 text-left">
                                                        <FormLabel className="text-sm font-medium text-slate-300 ml-1">ยืนยันรหัสผ่าน</FormLabel>
                                                        <FormControl>
                                                            <div className="relative group">
                                                                <ShieldCheck className="absolute left-3 top-3 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-indigo-400" />
                                                                <Input
                                                                    type="password"
                                                                    placeholder="••••••••"
                                                                    {...field}
                                                                    className="h-12 border-white/10 bg-black/20 pl-10 text-white placeholder:text-slate-500 hover:bg-black/30 focus:border-indigo-500/50 focus:bg-black/30 focus:ring-indigo-500/20 transition-all rounded-xl"
                                                                />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage className="text-red-300 ml-1" />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            className="group relative mt-2 h-12 w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-lg font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-indigo-500/25 disabled:opacity-70"
                                            disabled={isLoading}
                                        >
                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "ลงทะเบียน"}
                                            </span>
                                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:animate-shimmer" />
                                        </Button>
                                    </form>
                                </Form>

                                <div className="mt-8 flex items-center gap-4 text-sm text-slate-400">
                                    <span className="h-px w-12 bg-gradient-to-r from-transparent to-slate-600" />
                                    <span>มีบัญชีอยู่แล้ว?</span>
                                    <span className="h-px w-12 bg-gradient-to-l from-transparent to-slate-600" />
                                </div>

                                <Button variant="ghost" className="mt-2 text-indigo-300 hover:text-white hover:bg-white/5" asChild>
                                    <Link href="/student/login">เข้าสู่ระบบ</Link>
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
