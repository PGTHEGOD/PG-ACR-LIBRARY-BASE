"use client"

import { useState, useEffect } from "react"
import { Search, Book, User, Sparkles, X, Info } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { useDebounce } from "use-debounce"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import type { BookRecord } from "@/lib/types"

interface SearchResponse {
    books: BookRecord[]
    total: number
}

export default function SearchPage() {
    const [query, setQuery] = useState("")
    const [debouncedQuery] = useDebounce(query, 500)
    const [results, setResults] = useState<BookRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [hasSearched, setHasSearched] = useState(false)

    // Initial load
    useEffect(() => {
        fetchBooks("")
    }, [])

    useEffect(() => {
        fetchBooks(debouncedQuery)
    }, [debouncedQuery])

    async function fetchBooks(search: string) {
        setIsLoading(true)
        try {
            const params = new URLSearchParams()
            if (search) params.set("q", search)
            params.set("perPage", "50")

            const res = await fetch(`/api/public/books?${params.toString()}`)
            if (!res.ok) throw new Error("Failed to fetch books")

            const data: SearchResponse = await res.json()
            setResults(data.books || [])
            setTotal(data.total || 0)
            setHasSearched(!!search)
        } catch (error) {
            toast.error("เกิดข้อผิดพลาดในการค้นหาหนังสือ", {
                description: "กรุณาลองใหม่อีกครั้งในภายหลัง"
            })
            console.error(error)
            setResults([])
        } finally {
            setTimeout(() => setIsLoading(false), 300)
        }
    }

    return (
        <div className="min-h-screen w-full bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">

            {/* Dynamic Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-blue-100/40 blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-purple-100/40 blur-[120px] animate-pulse-slow delay-1000" />
                <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[50%] h-[50%] rounded-full bg-indigo-50/50 blur-[100px]" />
            </div>

            <div className="relative z-10 container mx-auto px-4 py-12 md:py-20 max-w-7xl">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="inline-flex items-center justify-center p-4 mb-8 rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50"
                    >
                        <Image
                            src="/assumption-rayoung.png"
                            alt="Logo"
                            width={72}
                            height={72}
                            className="object-contain"
                            priority
                        />
                    </motion.div>
                    <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-slate-900 via-blue-900 to-slate-700 mb-6 drop-shadow-sm tracking-tight">
                        ค้นหาหนังสือ
                    </h1>
                    <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto font-light leading-relaxed">
                        ห้องสมุดโรงเรียนอัสสัมชัญระยอง (Assumption College Rayong)
                    </p>
                </motion.div>

                {/* Search Bar Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="sticky top-6 z-40 max-w-3xl mx-auto mb-16"
                >
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-200 to-purple-200 rounded-full opacity-50 group-hover:opacity-80 blur-lg transition duration-500 will-change-transform" />
                        <div className="relative flex items-center bg-white/80 rounded-full border border-slate-200 backdrop-blur-xl shadow-xl shadow-slate-200/20 transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/30">
                            <Search className="absolute left-6 h-6 w-6 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="ค้นหาชื่อหนังสือ, ผู้แต่ง, หรือรหัส..."
                                className="h-16 pl-16 pr-14 text-lg bg-transparent border-0 focus-visible:ring-0 placeholder:text-slate-400 text-slate-900 w-full rounded-full font-medium"
                            />
                            {query && (
                                <button
                                    onClick={() => setQuery("")}
                                    className="absolute right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center px-4 text-sm font-medium">
                        <span className="text-slate-500 transition-opacity duration-300" style={{ opacity: isLoading ? 0.5 : 1 }}>
                            {isLoading ? "กำลังอัปเดต..." : `พบหนังสือทั้งหมด ${total} เล่ม`}
                        </span>
                        {hasSearched && !isLoading && (
                            <motion.span
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100"
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                ผลการค้นหาสำหรับ "{debouncedQuery}"
                            </motion.span>
                        )}
                    </div>
                </motion.div>

                {/* Results Grid */}
                <div className="min-h-[400px]">
                    {isLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="flex flex-col space-y-3">
                                    <Skeleton className="h-[280px] w-full rounded-2xl bg-slate-200/60" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-3/4 rounded-lg bg-slate-200/60" />
                                        <Skeleton className="h-3 w-1/2 rounded-lg bg-slate-200/60" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : results.length > 0 ? (
                        <motion.div
                            layout
                            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
                        >
                            <TooltipProvider delayDuration={300}>
                                <AnimatePresence mode="popLayout">
                                    {results.map((book, index) => (
                                        <motion.div
                                            key={book.assumptionCode}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ duration: 0.3, delay: index * 0.05 }}
                                        >
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Card className="h-full bg-white border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500 group overflow-hidden flex flex-col hover:-translate-y-2 cursor-pointer rounded-2xl">
                                                        <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-100">
                                                            {book.coverUrl ? (
                                                                <Image
                                                                    src={book.coverUrl}
                                                                    alt={book.title}
                                                                    fill
                                                                    className="object-cover transition-transform duration-700 group-hover:scale-110 group-hover:filter group-hover:brightness-105"
                                                                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                                                                />
                                                            ) : (
                                                                <div className="flex h-full w-full flex-col items-center justify-center p-6 text-slate-400 bg-slate-50">
                                                                    <Book className="h-16 w-16 mb-3 opacity-30 group-hover:opacity-50 group-hover:scale-110 transition-all duration-500" />
                                                                    <span className="text-xs text-center font-medium opacity-60">No Cover</span>
                                                                </div>
                                                            )}

                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                        </div>

                                                        <CardContent className="flex-1 p-5 pt-4 relative flex flex-col gap-2">
                                                            <div className="flex justify-between items-start w-full mb-1">
                                                                <Badge
                                                                    variant={book.status === "available" ? "default" : "destructive"}
                                                                    className={`
                                  ${book.status === "available"
                                                                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                                            : "bg-rose-100 text-rose-700 border-rose-200"
                                                                        } border shadow-sm px-2.5 py-0.5 text-xs font-semibold tracking-wide shrink-0
                                `}
                                                                >
                                                                    {book.status === "available" ? "ว่าง" : "ถูกยืม"}
                                                                </Badge>
                                                            </div>

                                                            {/* The user previously commented this section out, so I will omit it to respect their choice,
                                   but I'll keep the structure clean. If they want it back, they can uncomment it in previous versions.
                                   I will comment it out in the code as well for reference if they check source. */}

                                                            {/* 
                               <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                    {book.shelfCode || "N/A"}
                                  </span>
                               </div> 
                               */}

                                                            <h3 className="font-bold text-base text-slate-800 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                                                                {book.title}
                                                            </h3>

                                                            <div className="mt-auto pt-2 flex items-center gap-2 text-sm text-slate-500 group-hover:text-slate-700 transition-colors">
                                                                <div className="p-1.5 rounded-full bg-slate-100 group-hover:bg-blue-50 transition-colors">
                                                                    <User className="h-3 w-3" />
                                                                </div>
                                                                <span className="line-clamp-1 text-xs">{book.author || "ไม่ระบุผู้แต่ง"}</span>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" className="max-w-[300px] bg-white text-slate-900 border-slate-200 p-4 shadow-xl">
                                                    <div className="space-y-2">
                                                        <p className="font-semibold text-slate-900">{book.title}</p>
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
                                                            <span>ผู้แต่ง:</span> <span className="text-slate-700">{book.author || "-"}</span>
                                                            <span>หมวดหมู่:</span> <span className="text-slate-700">{book.category || "-"}</span>
                                                            <span>รหัส:</span> <span className="text-slate-700 font-mono">{book.assumptionCode}</span>
                                                            <span>ปีที่พิมพ์:</span> <span className="text-slate-700">{book.publishYear || "-"}</span>
                                                        </div>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </TooltipProvider>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-20 text-center"
                        >
                            <div className="bg-slate-50 rounded-full p-10 mb-6 border border-slate-100 shadow-sm">
                                <Search className="h-16 w-16 text-slate-300" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">ไม่พบหนังสือที่ค้นหา</h3>
                            <p className="text-slate-500 max-w-md mx-auto">
                                ลองตรวจสอบคำสะกด หรือลองใช้คำค้นหาที่กว้างขึ้น
                            </p>
                            <button
                                onClick={() => setQuery("")}
                                className="mt-8 px-6 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors border border-slate-200 shadow-sm"
                            >
                                ล้างคำค้นหา
                            </button>
                        </motion.div>
                    )}
                </div>

                {/* Footer */}
                <footer className="mt-20 text-center py-8 border-t border-slate-200">
                    <p className="text-slate-400 text-sm">
                        &copy; {new Date().getFullYear()} Assumption College Rayong Library. All rights reserved.
                    </p>
                </footer>
            </div>
        </div>
    )
}
