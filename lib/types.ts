export interface StudentRecord {
  id: number
  studentCode: string
  classLevel: string
  room: string | null
  number: string | null
  title: string | null
  firstName: string
  lastName: string
  createdAt: string
  updatedAt: string
}

export interface AttendanceRecord {
  id: number
  studentId: number
  studentCode: string
  attendanceDate: string
  attendanceTime: string
  purposes: string[]
  classLevel: string
  room: string | null
  title: string | null
  number: string | null
  firstName: string
  lastName: string
}

export interface AttendanceStats {
  totalRecords: number
  uniqueStudents: number
  purposeCounts: Record<string, number>
}

export interface StudentImportRow {
  studentCode: string
  classLevel: string
  room: string
  number: string
  title: string
  firstName: string
  lastName: string
}

export interface AttendanceResponse {
  records: AttendanceRecord[]
  stats: AttendanceStats
}

export interface PaginatedStudents {
  students: StudentRecord[]
  total: number
}

// Additional library types for teacher portal
export interface BookRecord {
  assumptionCode: string
  barcode: string
  category: string
  shelfCode: string
  authorCode: string
  edition: string
  volumeNumber: string
  language: string
  printNumber: string
  purchaseDate: string
  source: string
  title: string
  isbn: string
  subject: string
  author: string
  publisher: string
  publishYear: number
  pages: number
  price: number
  coverUrl: string
  coverOverride?: string
  status: "available" | "borrowed"
  borrowedBy?: string
  borrowedStudentName?: string
  borrowedAt?: string
  dueDate?: string
}

export interface LoanRecord {
  id: number
  studentId: string
  assumptionCode: string
  barcode: string
  title: string
  borrowedAt: string
  returnedAt?: string
  status: "borrowed" | "returned"
}

export interface ScoreEntry {
  id: number
  studentId: string
  change: number
  note: string
  createdAt: string
}

export interface BookInput {
  assumptionCode: string
  barcode: string
  category: string
  shelfCode: string
  authorCode: string
  edition: string
  volumeNumber: string
  language: string
  printNumber: string
  purchaseDate: string
  source: string
  title: string
  isbn: string
  subject: string
  author: string
  publisher: string
  publishYear: number
  pages: number
  price: number
  coverUrl?: string
}

export interface LibraryStudentProfile {
  student: StudentRecord
  loans: LoanRecord[]
  stats: {
    points: number
    activeLoans: number
    totalLoans: number
  }
  scoreHistory: ScoreEntry[]
  restrictions?: {
    requireFullReturn: boolean
  }
}
