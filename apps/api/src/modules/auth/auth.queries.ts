"use server"

import { db } from "../../db/client.js"
import { EmailVerification, Users } from "../../db/schema.js"
import { and, desc, eq } from "drizzle-orm"

export const AuthQueries = {
    async createUser(name: string, email: string, passwordHash: string) {
        return await db.insert(Users).values({ name: name, email: email, password: passwordHash }).returning({ user_id: Users.id })
    },
    
    async getUserByEmail(email: string) {
        return await db.query.Users.findFirst({
            where: eq(Users.email, email) 
        })
    },

    async updateProfile(name: string, userId: number) {
        await db.update(Users)
        .set({ name: name })
        .where(eq(Users.id, userId))
    },

    async updatePassword(userId: number, newPassword: string) {
        await db.update(Users)
        .set({ password: newPassword })
        .where(eq(Users.id, userId))
    },

    async setEmailVerifiedAsTrue(userId: number) {
        await db.update(Users)
        .set({ email_verified: true })
        .where(eq(Users.id, userId))

        await db.update(EmailVerification)
        .set({ used: true })
        .where(eq(EmailVerification.user_id, userId))
    },

    async storeEmailVerificationCode(userId: number, code_hash: string, expires_at: Date) {
        await db.insert(EmailVerification).values({ 
            user_id: userId, code_hash: code_hash, 
            expires_at: expires_at
         })
    },

    async getEmailVerificationCode(userId: number) {
        return await db.select({
            code_hash: EmailVerification.code_hash,
            expires_at: EmailVerification.expires_at,
            created_at: EmailVerification.created_at,
        })
        .from(EmailVerification)
        .where(and(eq(EmailVerification.user_id, userId), eq(EmailVerification.used, false)))
        .orderBy(desc(EmailVerification.created_at), desc(EmailVerification.id))
    }
}
