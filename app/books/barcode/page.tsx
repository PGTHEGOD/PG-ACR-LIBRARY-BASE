"use client"

import { useMemo, useState, useRef, useEffect, type KeyboardEvent, type DragEvent } from "react"
import { Printer, Loader2, ArrowLeft, Barcode, HelpCircle, AlertCircle, X, Search, GripHorizontal, Plus } from "lucide-react"
import Link from "next/link"
import NextImage from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import type { BookRecord } from "@/lib/types"
import { getCategoryStyle } from "@/lib/utils/category-colors"

const PAGE_BOXES = 40 // 4 x 10
const COLS = 4
const ROWS = 10

// 1 ID => 2 stickers (Type A: call-number only, Type B: barcode)
const STICKERS_PER_ID = 2
const MAX_IDS_PER_PAGE = PAGE_BOXES / STICKERS_PER_ID // 20

// Validation Status
type TagStatus = "pending" | "valid" | "invalid"

interface TagItem {
    id: string // react key (random)
    value: string // input value
    status: TagStatus
    book?: BookRecord
}

type LabelSlot =
    | { kind: "CALL"; book: BookRecord }
    | { kind: "BARCODE"; book: BookRecord }
    | { kind: "BLANK" }

export default function BarcodeGeneratorPage() {
    const [tags, setTags] = useState<TagItem[]>([])
    const [inputValue, setInputValue] = useState("")
    const [generated, setGenerated] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState<number>(-1)
    const [showSearch, setShowSearch] = useState(false)
    const [loadedImages, setLoadedImages] = useState(0)

    // Ref for the input to focus when container clicked
    const inputRef = useRef<HTMLInputElement>(null)

    // Validate a single ID against the API
    const validateId = async (idValue: string): Promise<BookRecord | null> => {
        try {
            const res = await fetch(`/api/library/books/${encodeURIComponent(idValue)}`)
            if (!res.ok) return null
            return (await res.json()) as BookRecord
        } catch {
            return null
        }
    }

    // Handle adding a new tag
    const addTag = async (value: string) => {
        const trimmed = value.trim()
        if (!trimmed) return
        if (tags.length >= MAX_IDS_PER_PAGE) return // enforce max

        // Create optimistic tag
        const tempId = crypto.randomUUID()
        const newTag: TagItem = {
            id: tempId,
            value: trimmed,
            status: "pending"
        }

        setTags(prev => [...prev, newTag])
        setInputValue("")
        setGenerated(false) // Reset generated state as data changes
        setLoadedImages(0)

        // Perform validation
        const book = await validateId(trimmed)
        setTags(prev => prev.map(t => {
            if (t.id === tempId) {
                return {
                    ...t,
                    status: book ? "valid" : "invalid",
                    book: book || undefined
                }
            }
            return t
        }))
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === " " || e.key === "Enter") {
            e.preventDefault()
            addTag(inputValue)
        } else if (e.key === "ArrowLeft") {
            if (inputValue === "" && tags.length > 0) {
                e.preventDefault()
                setSelectedIndex(prev => (prev === -1 ? tags.length - 1 : Math.max(0, prev - 1)))
            }
        } else if (e.key === "ArrowRight") {
            if (inputValue === "" && selectedIndex !== -1) {
                e.preventDefault()
                if (selectedIndex < tags.length - 1) {
                    setSelectedIndex(prev => prev + 1)
                } else {
                    setSelectedIndex(-1) // Deselect
                }
            }
        } else if (e.key === "Backspace") {
            if (inputValue === "") {
                if (selectedIndex !== -1) {
                    // Delete selected
                    e.preventDefault()
                    const newTags = [...tags]
                    newTags.splice(selectedIndex, 1)
                    setTags(newTags)
                    setGenerated(false)
                    setLoadedImages(0)
                    // If we deleted the last item, keep index at last item (length - 1)
                    // If we deleted from middle, keep index same (which is now the next item) unless it was last
                    if (newTags.length === 0) {
                        setSelectedIndex(-1)
                    } else if (selectedIndex >= newTags.length) {
                        setSelectedIndex(newTags.length - 1)
                    }
                } else if (tags.length > 0) {
                    // Standard behavior: select last tag first
                    setSelectedIndex(tags.length - 1)
                }
            }
        } else {
            // Any other key clears selection
            setSelectedIndex(-1)
        }
    }

    const removeTag = (id: string) => {
        setTags(prev => prev.filter(t => t.id !== id))
        setGenerated(false)
        setLoadedImages(0)
    }

    const handleManualGenerate = () => {
        setGenerated(true)
        setLoadedImages(0)
    }

    const handlePrint = () => window.print()

    // Collect valid books for generation
    const validBooks = useMemo(() => {
        return tags
            .filter(t => t.status === "valid" && t.book)
            .map(t => t.book!)
    }, [tags])

    const pageSlots: LabelSlot[] = useMemo(() => {
        const slots: LabelSlot[] = []

        for (const b of validBooks) {
            slots.push({ kind: "CALL", book: b })
            slots.push({ kind: "BARCODE", book: b })
        }

        const trimmed = slots.slice(0, PAGE_BOXES)
        while (trimmed.length < PAGE_BOXES) trimmed.push({ kind: "BLANK" })
        return trimmed
    }, [validBooks])

    const allImagesLoaded = generated && validBooks.length > 0 && loadedImages >= validBooks.length

    // Drag Drop Handlers for Drop Zone
    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "copy"
    }

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        const id = e.dataTransfer.getData("text/plain")
        if (id) {
            addTag(id)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 print:bg-white print:p-0 relative">
            {/* Header (Hidden in print) */}
            <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 px-4 py-4 backdrop-blur-md print:hidden">
                <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-blue-50 shadow-sm border border-blue-100">
                            <NextImage src="/assumption-rayoung.png" alt="Assumption College Rayong" fill className="object-contain p-2" priority />
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-blue-700 font-bold">Assumption College Rayong</p>
                            <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">Barcode Generator</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Link href="/books">
                            <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-slate-600 hover:text-blue-700 hover:bg-blue-50">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                กลับไปหน้าจัดการ
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content (Hidden in print) */}
            <main className="mx-auto w-full max-w-6xl px-4 py-8 print:hidden">
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">สร้างสติ๊กเกอร์บาร์โค้ด</h2>
                        <p className="text-slate-500 max-w-2xl">
                            ระบุรหัสหนังสือแล้วกด Spacebar หรือลากข้อมูลจาก Search Window มาวางได้เลย
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowSearch(!showSearch)}
                            className={showSearch ? "bg-blue-50 text-blue-600 border-blue-200" : ""}
                        >
                            <Search className="mr-2 h-4 w-4" />
                            {showSearch ? "ซ่อนค้นหา" : "ค้นหาหนังสือ"}
                        </Button>
                        <Button
                            onClick={handlePrint}
                            disabled={!allImagesLoaded}
                            size="lg"
                            className={allImagesLoaded ? "bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200" : ""}
                        >
                            {generated && !allImagesLoaded && validBooks.length > 0 ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    รอโหลดรูป ({loadedImages}/{validBooks.length})
                                </>
                            ) : (
                                <>
                                    <Printer className="mr-2 h-5 w-5" />
                                    สั่งพิมพ์ PDF
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                    {/* Input Section */}
                    <div className="space-y-6">
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                            <Barcode className="h-4 w-4 text-blue-600" />
                                            รายการรหัส (Tags Input)
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            พิมพ์รหัสแล้วกด <strong>Spacebar</strong> หรือ <strong>ลากหนังสือมาวางในกล่องนี้</strong>
                                        </CardDescription>
                                    </div>
                                    <Badge variant="outline" className={tags.length >= MAX_IDS_PER_PAGE ? "bg-red-50 text-red-600 border-red-200" : "bg-white"}>
                                        {tags.length} / {MAX_IDS_PER_PAGE} รหัส
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="p-0">
                                <div
                                    className="flex flex-wrap items-start content-start gap-2 p-4 min-h-[200px] w-full bg-white cursor-text transition-colors"
                                    onClick={() => inputRef.current?.focus()}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                >
                                    {tags.length === 0 && (
                                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-300">
                                            <span className="flex items-center gap-2 text-sm">
                                                <Plus className="h-4 w-4" /> Drop Books Here
                                            </span>
                                        </div>
                                    )}

                                    {tags.map((tag, index) => {
                                        const isSelected = index === selectedIndex
                                        return (
                                            <div
                                                key={tag.id}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedIndex(index)
                                                    inputRef.current?.focus()
                                                }}
                                                className={`
                                 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium border transition-all cursor-pointer select-none z-10
                                 ${isSelected ? 'ring-2 ring-offset-1 ring-slate-400' : ''}
                                 ${tag.status === 'valid'
                                                        ? (isSelected ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-blue-50 text-blue-700 border-blue-200')
                                                        : ''}
                                 ${tag.status === 'invalid'
                                                        ? (isSelected ? 'bg-red-100 text-red-800 border-red-300' : 'bg-red-50 text-red-700 border-red-200')
                                                        : ''}
                                 ${tag.status === 'pending'
                                                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                                                        : ''}
                               `}
                                            >
                                                {tag.status === 'pending' && <Loader2 className="h-3 w-3 animate-spin" />}
                                                {tag.status === 'valid' && <Search className="h-3 w-3 opacity-50" />}
                                                {tag.status === 'invalid' && <AlertCircle className="h-3 w-3" />}
                                                <span>{tag.value}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeTag(tag.id) }}
                                                    className="hover:bg-black/10 rounded-full p-0.5 ml-1 transition-colors"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )
                                    })}

                                    <input
                                        ref={inputRef}
                                        type="text"
                                        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-1.5 placeholder:text-slate-400 z-10"
                                        placeholder={tags.length === 0 ? "" : ""} // Placeholder handled by overlay
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        disabled={tags.length >= MAX_IDS_PER_PAGE}
                                    />
                                </div>
                            </CardContent>

                            <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex justify-between items-center">
                                <div className="text-xs text-slate-500">
                                    {tags.filter(t => t.status === 'invalid').length > 0 && (
                                        <span className="text-red-600 font-medium flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            พบรหัสที่ไม่ถูกต้อง กรุณาลบออกก่อนพิมพ์
                                        </span>
                                    )}
                                </div>
                                <Button
                                    onClick={handleManualGenerate}
                                    disabled={tags.length === 0 || tags.some(t => t.status === 'pending')}
                                    size="sm"
                                    variant={generated ? "outline" : "default"}
                                >
                                    {generated ? "อัปเดตข้อมูล" : "เตรียมพิมพ์"}
                                </Button>
                            </div>
                        </Card>

                        {generated && validBooks.length > 0 && (
                            <Alert className="bg-green-50 text-green-900 border-green-200">
                                <AlertDescription className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    พร้อมพิมพ์ {validBooks.length} เล่ม ({validBooks.length * 2} ดวง)
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    {/* Sidebar Guidelines */}
                    <div className="space-y-6">
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <HelpCircle className="h-4 w-4 text-slate-400" />
                                    คำแนะนำการพิมพ์
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-slate-600 space-y-3">
                                <div className="flex gap-3 items-start">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">1</div>
                                    <p>ตั้งค่ากระดาษเป็น <strong>A4</strong></p>
                                </div>
                                <div className="flex gap-3 items-start">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">2</div>
                                    <p>ตั้งค่า Scale เป็น <strong>100%</strong> (ห้ามเลือก Fit to page)</p>
                                </div>
                                <div className="flex gap-3 items-start">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">3</div>
                                    <p>ปิดตัวเลือก <strong>Headers and footers</strong></p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            {/* Book Search Floating Widget */}
            {showSearch && <BookSearchWidget onClose={() => setShowSearch(false)} />}

            {/* Print area */}
            {generated && (
                <div className="print-area mx-auto bg-white shadow-xl print:shadow-none hidden print:block">
                    <style jsx global>{`
            @media print {
              @page {
                size: A4;
                margin: 0;
              }
              html,
              body {
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .print-area {
                width: 210mm;
                height: 297mm;
                margin: 0 !important;
                padding: 0 !important;
              }
            }

            :root {
              --page-w: 210mm;
              --page-h: 297mm;
              --cols: ${COLS};
              --rows: ${ROWS};
              --gap-x: 2mm;
              --gap-y: 2mm;
              --box-w: 50mm;
              --box-h: 27mm;
              --pad-top: 4.5mm;
              --pad-left: 2mm;
              --border: 0.3mm solid #000;
            }

            .a4-page {
              width: var(--page-w);
              height: var(--page-h);
              box-sizing: border-box;
              padding-top: var(--pad-top);
              padding-left: var(--pad-left);
            }

            .sticker-grid {
              display: grid;
              grid-template-columns: repeat(var(--cols), var(--box-w));
              grid-auto-rows: var(--box-h);
              gap: var(--gap-y) var(--gap-x);
              width: calc(var(--cols) * var(--box-w) + (var(--cols) - 1) * var(--gap-x));
              height: calc(var(--rows) * var(--box-h) + (var(--rows) - 1) * var(--gap-y));
            }

            .box {
              border: var(--border);
              box-sizing: border-box;
              background: #fff;
              overflow: hidden;
              page-break-inside: avoid;
            }

            .call-only {
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              font-weight: 700;
              font-size: 10pt;
              line-height: 1.05;
              padding: 2mm;
            }

            .barcode-box {
              display: flex;
              flex-direction: column;
              padding: 1.5mm 2mm;
              font-size: 8pt;
              box-sizing: border-box;
            }
            .barcode-title {
              font-weight: 600;
              height: 4mm;
              line-height: 1.1;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
              text-align: center;
            }
            .barcode-mid {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 0.5mm 0;
            }
            .barcode-img {
              height: 11mm;
              width: auto;
              max-width: 100%;
              object-fit: contain;
            }
            .barcode-bottom {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              line-height: 1;
              padding: 0 0.5mm;
            }
            .bottom-left { font-weight: 700; }
            .bottom-right { 
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
              font-weight: 500; 
            }
          `}</style>

                    <div className="a4-page">
                        <div className="sticker-grid">
                            {pageSlots.map((slot, idx) => {
                                if (slot.kind === "BLANK") return <div key={`blank-${idx}`} className="box" />
                                if (slot.kind === "CALL") return <CallOnlyLabel key={`call-${idx}`} book={slot.book} />
                                return <BarcodeOnlyLabel key={`bar-${idx}`} book={slot.book} onLoad={() => setLoadedImages(prev => prev + 1)} />
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// -------------------------------------------------------------
// HELPER COMPONENTS
// -------------------------------------------------------------

function CallOnlyLabel({ book }: { book: BookRecord }) {
    const { bg, text } = getCategoryStyle(book.category || "")
    return (
        <div className="box call-only" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2mm" }}>
                <div>{book.shelfCode || "-"}</div>
                <div style={{ margin: "1mm 0" }}>{book.authorCode || "-"}</div>
                <div>{book.edition ? `ฉ.${book.edition}` : ""}</div>
            </div>
            {bg !== "transparent" && (
                <div style={{
                    height: "5mm",
                    width: "100%",
                    backgroundColor: bg,
                    color: text,
                    fontSize: "8pt",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold"
                }}>
                    {/* {book.category?.split(" ")[0]} */}
                </div>
            )}
        </div>
    )
}

function BarcodeOnlyLabel({ book, onLoad }: { book: BookRecord; onLoad?: () => void }) {
    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(
        book.assumptionCode
    )}&scale=3&height=10&textxalign=center&includetext=false`

    return (
        <div className="box barcode-box">
            <div className="barcode-title">
                {book.shelfCode || "-"}/{book.title || ""}
            </div>
            <div className="barcode-mid">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={barcodeUrl}
                    alt={book.assumptionCode}
                    className="barcode-img"
                    onLoad={onLoad}
                />
            </div>
            <div className="barcode-bottom">
                <span className="bottom-left">{book.authorCode || "A-T"}</span>
                <span className="bottom-right">{book.assumptionCode}</span>
            </div>
        </div>
    )
}

function BookSearchWidget({ onClose }: { onClose: () => void }) {
    const [pos, setPos] = useState({ x: 20, y: 100 })
    const [dragging, setDragging] = useState(false)
    const [rel, setRel] = useState({ x: 0, y: 0 }) // Relative position of cursor to top-left of widget

    // Search logic
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<BookRecord[]>([])
    const [loading, setLoading] = useState(false)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!query.trim()) {
                setResults([])
                return
            }
            setLoading(true)
            try {
                // Try to use existing API with search param
                const res = await fetch(`/api/library/books?search=${encodeURIComponent(query)}&perPage=20`)
                if (res.ok) {
                    const data = await res.json()
                    // Handle both pagination format and simple array
                    const books = data.books || (Array.isArray(data) ? data : [])
                    setResults(books)
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [query])

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return
        setDragging(true)
        setRel({
            x: e.clientX - pos.x,
            y: e.clientY - pos.y
        })
        e.stopPropagation()
        e.preventDefault()
    }

    const handleMouseMove = (e: MouseEvent) => {
        if (!dragging) return
        setPos({
            x: e.clientX - rel.x,
            y: e.clientY - rel.y
        })
        e.stopPropagation()
        e.preventDefault()
    }

    const handleMouseUp = () => {
        setDragging(false)
    }

    // Attach global listeners for drag
    useEffect(() => {
        if (dragging) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
        } else {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [dragging])

    const handleDragStartItem = (e: DragEvent<HTMLDivElement>, book: BookRecord) => {
        e.dataTransfer.setData("text/plain", book.assumptionCode)
        e.dataTransfer.effectAllowed = "copy"
    }

    return (
        <div
            className="fixed z-50 w-80 bg-white rounded-lg shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
            style={{
                left: pos.x,
                top: pos.y,
                height: '500px'
            }}
        >
            {/* Header / Drag Handle */}
            <div
                className="bg-slate-100 p-2 flex items-center justify-between cursor-move select-none border-b border-slate-200"
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <GripHorizontal className="h-4 w-4 text-slate-400" />
                    Find Books
                </div>
                <button onClick={onClose} className="hover:bg-slate-200 rounded p-1">
                    <X className="h-4 w-4 text-slate-500" />
                </button>
            </div>

            {/* Content */}
            <div className="p-3 bg-white flex flex-col flex-1 gap-3 overflow-hidden">
                <Input
                    placeholder="Search title, author..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                />

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {loading && (
                        <div className="flex justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        </div>
                    )}

                    {!loading && results.map(book => (
                        <div
                            key={book.assumptionCode}
                            draggable
                            onDragStart={(e) => handleDragStartItem(e, book)}
                            className="flex gap-2 p-2 rounded-md border border-slate-100 hover:border-blue-300 hover:bg-blue-50 cursor-grab active:cursor-grabbing group bg-white shadow-sm"
                        >
                            {/* Minimal Cover */}
                            <div className="w-10 h-14 bg-slate-100 shrink-0 relative overflow-hidden rounded-sm">
                                {book.coverUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={book.coverUrl} alt="" className="object-cover w-full h-full" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-300 font-bold">
                                        BOOK
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">{book.title}</div>
                                <div className="text-[10px] text-slate-500 truncate">{book.author}</div>
                                <div className="mt-1 flex items-center gap-1">
                                    <Badge variant="outline" className="text-[10px] h-4 px-1 py-0">{book.assumptionCode}</Badge>
                                </div>
                            </div>
                        </div>
                    ))}

                    {!loading && results.length === 0 && query && (
                        <div className="text-center text-xs text-slate-400 py-4">
                            No books found
                        </div>
                    )}
                </div>

                <div className="text-[10px] text-slate-400 text-center">
                    Drag items to the background list to add
                </div>
            </div>
        </div>
    )
}
