import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { randomUUID } from "crypto"
import { hashPassword } from "@/lib/server/auth"
import { execute, queryJson, queryRows } from "@/lib/db"
import { sendEmail } from "@/lib/mail"

// Define schema
const registerSchema = z.object({
    studentCode: z.string().min(1, "Student ID is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { studentCode, password } = registerSchema.parse(body)
        const email = `${studentCode}@acr.ac.th`

        // 1. Check if student exists in the school database
        const studentRows = await queryRows<{ student_code: string }>(
            "SELECT student_code FROM students WHERE student_code = ?",
            [studentCode]
        )

        if (studentRows.length === 0) {
            return NextResponse.json(
                { error: "ไม่พบรหัสนักเรียนในระบบ" },
                { status: 404 }
            )
        }

        // 2. Check if already registered
        const accountRows = await queryRows<{ student_id: string }>(
            "SELECT student_id FROM library_student_accounts WHERE student_id = ?",
            [studentCode]
        )

        if (accountRows.length > 0) {
            return NextResponse.json(
                { error: "บัญชีนี้ลงทะเบียนไปแล้ว" },
                { status: 409 }
            )
        }

        // 3. Hash password
        const passwordHash = await hashPassword(password)

        // 4. Generate verification token
        const verificationToken = randomUUID()

        // 5. Create account
        await execute(
            `INSERT INTO library_student_accounts (student_id, password_hash, email, verification_token, is_verified)
       VALUES (?, ?, ?, ?, 0)`,
            [studentCode, passwordHash, email, verificationToken]
        )

        // 6. Send verification email
        const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin")}/api/auth/verify?token=${verificationToken}`
        console.log("----------------------------------------------------------------")
        console.log("📢 VERIFICATION LINK (Click here if email fails):")
        console.log(verificationUrl)
        console.log("----------------------------------------------------------------")

        await sendEmail({
            to: email,
            subject: "Verify your ACR Library Account",
            html: `
        <!DOCTYPE html>
            <html lang="th">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>ยืนยันตัวตน - ห้องสมุด ACR</title>
                <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    /* Mobile Reset */
                    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
                    
                    /* Font settings for Thai */
                    body, table, td, p, a, h1, h2 {
                        font-family: 'Sarabun', 'Tahoma', sans-serif !important;
                    }

                    /* Responsive Styling */
                    @media screen and (max-width: 600px) {
                        .container { width: 100% !important; }
                        .content { padding: 20px !important; }
                        .mobile-header { font-size: 22px !important; }
                    }
                </style>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f6f9fc;">

                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f6f9fc;">
                    <tr>
                        <td align="center" style="padding: 40px 0;">
                            
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden;">
                                
                                <tr>
                                    <td align="center" style="background-color: #1a73e8; padding: 35px;">
                                        <img src="${process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin")}/assumption-rayoung.png" alt="ACR Logo" width="80" height="80" style="display: block; margin-bottom: 15px;">
                                        <h1 class="mobile-header" style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                                            📚 ห้องสมุดโรงเรียนอัสสัมชัญระยอง
                                        </h1>
                                    </td>
                                </tr>

                                <tr>
                                    <td class="content" style="padding: 40px; text-align: left;">
                                        <h2 style="color: #202124; margin-top: 0; font-size: 24px; font-weight: bold;">
                                            ยินดีต้อนรับสมาชิกใหม่!
                                        </h2>
                                        
                                        <p style="color: #5f6368; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                                            ขอบคุณที่สมัครสมาชิกห้องสมุดโรงเรียนอัสสัมชัญระยอง<br>
                                            เพื่อเริ่มต้นการใช้งานระบบ กรุณากดยืนยันอีเมลของคุณที่ปุ่มด้านล่างครับ
                                        </p>

                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 30px 0; width: 100%;">
                                            <tr>
                                                <td align="center">
                                                    <a href="${verificationUrl}" target="_blank" style="font-size: 18px; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 50px; background-color: #1a73e8; display: inline-block; font-weight: bold; box-shadow: 0 2px 5px rgba(26, 115, 232, 0.3);">
                                                        ยืนยันบัญชี
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>

                                        <p style="color: #5f6368; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                                            หากปุ่มด้านบนใช้งานไม่ได้ สามารถคลิกที่ลิงก์นี้แทน:
                                        </p>
                                        <p style="word-break: break-all;">
                                            <a href="${verificationUrl}" style="color: #1a73e8; font-size: 14px;">${verificationUrl}</a>
                                        </p>
                                    </td>
                                </tr>

                                <tr>
                                    <td style="background-color: #f1f3f4; padding: 20px; text-align: center;">
                                        <p style="color: #80868b; font-size: 12px; margin: 0; line-height: 1.5;">
                                            © ${new Date().getFullYear()} ACR School Library<br>
                                            หากคุณไม่ได้เป็นผู้ทำรายการนี้ กรุณาเพิกเฉยต่ออีเมลฉบับนี้
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            </td>
                    </tr>
                </table>

            </body>
            </html>
      `,
        })

        return NextResponse.json({ message: "Registration successful. Please check your email to verify." })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
        }
        console.error("Registration error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
