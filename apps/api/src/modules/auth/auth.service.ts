"use server"

import { AuthQueries } from "./auth.queries.js"
import type { RegisterInput, LoginInput, getUserInput } from "./auth.types.js"
import * as bcrypt from "bcrypt"
import 'dotenv/config'
import nodemailer from "nodemailer"

const PEPPER = process.env.PEPPER_SECRET!

export const brevoSmtpOptions = {
    host: "smtp-relay.brevo.com",
    secure: false,
    port: 587,
    auth: {
        user: process.env.SMTP_LOGIN,
        pass: process.env.SMTP_KEY,
    },
}

let transporter = nodemailer.createTransport(brevoSmtpOptions)

export function setEmailTransporterForTesting(nextTransporter: typeof transporter) {
    const previousTransporter = transporter
    transporter = nextTransporter

    return () => {
        transporter = previousTransporter
    }
}

export const AuthService = {    
    async register(data: RegisterInput) {
        const userExists = await AuthQueries.getUserByEmail(data.email)
        if (userExists) {
            throw { statusCode: 409, message: "user already logged in" }
        }
        
        const hashedPassword = await bcrypt.hash(data.password, 10)

        const query = await AuthQueries.createUser(data.name, data.email, hashedPassword)
        
        return { user_id: query[0]!.user_id, message: "user created!" }
    },
    
    async generateEmailVerificationCode() {
        const min = 10000
        const max = 99999
        const range = max - min + 1
        
        const uint32 = new Uint32Array(1)
        crypto.getRandomValues(uint32)

        return min + (uint32[0]! % range)
    },

    async hashEmailVerificaitonCode(code: number) {
        const saltRounds = 10
        const toHash = code.toString() + PEPPER

        return await bcrypt.hash(toHash, saltRounds)
    },

    async storeEmailVerificationCode(userId: number) {
        const genCode = await this.generateEmailVerificationCode()
        const codeHash = await this.hashEmailVerificaitonCode(genCode)
        const durationInMinutes = 5
        const expiresAt: Date = new Date(Date.now() + durationInMinutes * 60 * 1000);

        try {
            await AuthQueries.storeEmailVerificationCode(userId, codeHash, expiresAt)
            return { code: genCode, message: "code stored in database!" }
        } catch (error) {
            console.error(error)
            return { error: "error while trying to store code in database" }
        }
    },

    async validateEmailVerificationCodeFromUser(userId: number, userCode: number) {
        try {
            const query = await AuthQueries.getEmailVerificationCode(userId)
            if (!query[0]) return false
            
            if (Date.now() > query[0]!.expires_at.getTime()) return false
            
            const toCompare = userCode.toString() + PEPPER

            return await bcrypt.compare(toCompare, query[0]!.code_hash)

        } catch (error) {
            console.error(error)
            return false
        }
    },

    async requestEmailVerificationCode(userId: number, email: string) {
        const user = await AuthQueries.getUserByEmail(email)
        if (!user) {
            throw { statusCode: 401, message: "user is not registered" }
        }

        if (user.email_verified) {
            return { statusCode: 409, message: "email already verified" }
        }

        const storeCode = await this.storeEmailVerificationCode(userId)
        if (!storeCode.code) {
            return { statusCode: 500, message: "could not create verification code" }
        }

        await this.sendEmail(email, storeCode.code)

        return { statusCode: 201, message: "verification code sent!" }
    },

    async sendEmail(email: string, code: number) {
        try {
            await transporter.sendMail({
                from: '"Studium" <noreply@studium-web.com>',
                to: email,
                subject: "Verification Code",
                text: `Your verication code is ${code}`
            })
        } catch (error) {
            console.error(error)
        }
    },


    async emailConfirmation(userId: number) {
        try {
            await AuthQueries.setEmailVerifiedAsTrue(userId)
            return { message: "email confirmed!" }
        } catch (error) {
            return { error: "error while trying to set email as confirmed" }
        }
    },

    async login(data: LoginInput) {
        const userExists = await AuthQueries.getUserByEmail(data.email)
        if (!userExists) {
            throw { statusCode: 401, error: "wrong credentials" }
        }

        const checkPassword = userExists.password ? await bcrypt.compare(data.password, userExists.password) : false
        if (!checkPassword) {
            return { statusCode: 401, error: "wrong credentials" }
        }

        return {
            id: userExists.id,
            name: userExists.name,
            email: userExists.email,
        }
    },

    async userInformation(data: getUserInput) {
        const getUser = await AuthQueries.getUserByEmail(data.email)
        if (!getUser) {
            throw { statusCode: 401, message: "user is not registered" }
        }

        return {
            id: getUser.id,
            name: getUser.name,
            email: getUser.email
        }
    },

    async updateProfile(userId: number, name: string) {
        try {
            await AuthQueries.updateProfile(name, userId)
            return { statusCode: 201, message: "profile name updated!" }
        } catch (error) {
            console.error(error)
            return { statusCode: 500, error: "could not update profile name." }
        }
    },

    async updatePassword(userId: number, newPassword: string) {
        try {
            const newHashedPassword = await bcrypt.hash(newPassword, 10)
            await AuthQueries.updatePassword(userId, newHashedPassword)
            return { statusCode: 201, message: "password updated!" }
        } catch (error) {
            console.error(error)
            return { statusCode: 500, error: "could not update password." }
        }
    }
}
