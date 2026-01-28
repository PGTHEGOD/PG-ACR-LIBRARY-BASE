import { cookies } from "next/headers"
import { verifyToken } from "./auth"

export interface UserSession {
    sub: string
    name: string
    role: string
}

export async function getCurrentStudent(): Promise<UserSession | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get("student_session")?.value

    if (!token) return null

    return verifyToken<UserSession>(token)
}
