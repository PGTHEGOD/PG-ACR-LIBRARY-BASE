import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { cookies } from "next/headers"
import { comparePassword, signToken } from "@/lib/server/auth"
import { queryJson, queryRows } from "@/lib/db"

const loginSchema = z.object({
    studentCode: z.string().min(1, "Student ID is required"),
    password: z.string().min(1, "Password is required"),
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { studentCode, password } = loginSchema.parse(body)

        // Fetch account
        const rows = await queryRows<{
            student_id: string
            password_hash: string
            is_verified: number
            first_name: string
            last_name: string
        }>(
            `SELECT a.student_id, a.password_hash, a.is_verified, s.first_name, s.last_name
       FROM library_student_accounts a
       JOIN students s ON s.student_code = a.student_id
       WHERE a.student_id = ?`,
            [studentCode]
        )

        const account = rows[0]

        if (!account) {
            return NextResponse.json(
                { error: "Invalid ID or password" },
                { status: 401 }
            )
        }

        // Check verification
        console.log("Login attempt:", { studentId: account.student_id, verified: account.is_verified, type: typeof account.is_verified })
        console.log("Full account object:", account)
        console.log("Account keys:", Object.keys(account))

        if (Number(account.is_verified) !== 1) {
            return NextResponse.json(
                { error: "Account not verified. Please check your email." },
                { status: 403 }
            )
        }

        // Check password
        const validPassword = await comparePassword(password, account.password_hash)
        if (!validPassword) {
            return NextResponse.json(
                { error: "Invalid ID or password" },
                { status: 401 }
            )
        }

        // Create session token
        const token = signToken({
            sub: account.student_id,
            name: `${account.first_name} ${account.last_name}`,
            role: "student",
        })

        // Set cookie
        const cookieStore = await cookies()
        cookieStore.set("student_session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: "/",
        })

        return NextResponse.json({ message: "Login successful" })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
        }
        console.error("Login error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
