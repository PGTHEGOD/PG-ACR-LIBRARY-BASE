import { NextRequest, NextResponse } from "next/server"
import { execute, queryRows } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")

    if (!token) {
        return NextResponse.json({ error: "Missing token" }, { status: 400 })
    }

    try {
        // Check if token exists
        const accounts = await queryRows<{ student_id: string }>(
            "SELECT student_id FROM library_student_accounts WHERE verification_token = ?",
            [token]
        )

        if (accounts.length === 0) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 })
        }

        // Verify account
        await execute(
            "UPDATE library_student_accounts SET is_verified = 1, verification_token = NULL WHERE verification_token = ?",
            [token]
        )

        // Redirect to login page
        const loginUrl = new URL("/student/login", req.url)
        loginUrl.searchParams.set("verified", "true")
        return NextResponse.redirect(loginUrl)
    } catch (error) {
        console.error("Verification error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
