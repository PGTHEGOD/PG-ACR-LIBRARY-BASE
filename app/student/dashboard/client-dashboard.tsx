"use client"

import { useState } from "react"
import { Search, Loader2, BookOpen, User, BookMarked, Sparkles } from "lucide-react"
import NextImage from "next/image"
import type { BookRecord } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion, AnimatePresence } from "framer-motion"

interface ClientDashboardProps {
    initialBooks: BookRecord[]
}

export default function ClientDashboard({ initialBooks }: ClientDashboardProps) {
    const [search, setSearch] = useState("")
    const [books, setBooks] = useState<BookRecord[]>(initialBooks)
    const [isLoading, setIsLoading] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault()
        if (!search.trim()) return

        setIsLoading(true)
        setHasSearched(true)
        try {
            const params = new URLSearchParams()
            params.set("q", search.trim())
            params.set("limit", "20")

            const response = await fetch(`/api/student/books?${params.toString()}`)
            const data = await response.json()

            if (response.ok) {
                setBooks(data.books || [])
            } else {
                setBooks([])
            }
        } catch (error) {
            console.error("Search error:", error)
            setBooks([])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-md">
            {/* Search Header */}
            <div className="p-6 md:p-8 bg-gradient-to-b from-white/10 to-transparent border-b border-white/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 shadow-inner ring-1 ring-white/10">
                            <Search className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">ค้นหาหนังสือ</h2>
                            <p className="text-sm text-slate-400">ตรวจสอบสถานะหนังสือในห้องสมุด</p>
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className="relative flex-1 max-w-md w-full">
                        <div className="relative group">
                            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            <Input
                                placeholder="ชื่อหนังสือ / ผู้แต่ง / Barcode..."
                                className="h-12 w-full border-white/10 bg-black/20 pl-12 text-white placeholder:text-slate-500 hover:bg-black/30 focus:border-blue-500/50 focus:bg-black/30 focus:ring-blue-500/20 rounded-xl transition-all"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isLoading}
                                className="absolute right-1.5 top-1.5 h-9 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/20 transition-all"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ค้นหา"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Results Area */}
            <div className="p-6 md:p-8">
                <ScrollArea className="h-[500px] w-full pr-4">
                    <AnimatePresence mode="wait">
                        {!hasSearched && books.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-24 text-center"
                            >
                                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/5 shadow-inner">
                                    <BookOpen className="h-10 w-10 text-slate-600" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">เริ่มการค้นหา</h3>
                                <p className="text-slate-500 max-w-xs mx-auto">พิมพ์คำค้นหาด้านบนเพื่อตรวจสอบว่าหนังสือที่คุณต้องการพร้อมให้ยืมหรือไม่</p>
                            </motion.div>
                        ) : books.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-24 text-center"
                            >
                                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-500/10 shadow-inner">
                                    <BookMarked className="h-10 w-10 text-red-400/50" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">ไม่พบผลลัพธ์</h3>
                                <p className="text-slate-500">ลองใช้คำค้นหาอื่น หรือตรวจสอบตัวสะกดอีกครั้ง</p>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {books.map((book, index) => (
                                    <motion.div
                                        key={book.assumptionCode}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="group relative flex gap-4 overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 hover:shadow-lg hover:shadow-blue-500/5"
                                    >
                                        {/* Hover Glow */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 opacity-0 transition-all duration-500 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-blue-500/5 group-hover:opacity-100" />

                                        <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-black/40 shadow-md">
                                            {book.coverUrl ? (
                                                <NextImage
                                                    src={book.coverUrl}
                                                    alt={book.title}
                                                    fill
                                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                    sizes="80px"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full flex-col items-center justify-center text-xs text-slate-600">
                                                    <BookOpen className="mb-2 h-6 w-6 opacity-20" />
                                                    <span>No Cover</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col flex-1 justify-between py-1 relative z-10">
                                            <div>
                                                <h4 className="text-lg font-semibold text-white line-clamp-1 group-hover:text-blue-300 transition-colors" title={book.title}>{book.title}</h4>
                                                <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
                                                    <User className="h-3.5 w-3.5" />
                                                    <span className="line-clamp-1">{book.author || "ไม่ระบุผู้แต่ง"}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5">{book.category || "ทั่วไป"}</span>
                                                    <span>{book.barcode}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-3">
                                                <div className="flex items-center gap-2">
                                                    {/* Optional: Add rating or other small details */}
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className={`
                            border-0 px-3 py-1 text-xs font-semibold uppercase tracking-wide
                            ${book.status === "available"
                                                            ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
                                                            : "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
                                                        }
                        `}
                                                >
                                                    <span className={`mr-2 h-1.5 w-1.5 rounded-full ${book.status === "available" ? "bg-green-400 box-shadow-green" : "bg-amber-400"}`} />
                                                    {book.status === "available" ? "ว่าง" : "ถูกยืม"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </ScrollArea>
            </div>
        </div>
    )
}
