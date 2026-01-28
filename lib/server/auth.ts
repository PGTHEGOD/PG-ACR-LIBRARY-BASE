import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const SALT_ROUNDS = 10
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-change-me"

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
}

export async function comparePassword(input: string, hash: string): Promise<boolean> {
    return bcrypt.compare(input, hash)
}

export function signToken(payload: object, expiresIn: string | number = "7d"): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

export function verifyToken<T>(token: string): T | null {
    try {
        return jwt.verify(token, JWT_SECRET) as T
    } catch (error) {
        return null
    }
}
