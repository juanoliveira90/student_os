"use server"

import { AuthQueries } from "./auth.queries.js"
import type { RegisterInput, LoginInput, getUserInput } from "./auth.types.js"
import * as bcrypt from "bcrypt"
import 'dotenv/config'
import nodemailer from "nodemailer"

const PEPPER = process.env.PEPPER_SECRET!
const EMAIL_VERIFICATION_CODE_TTL_MINUTES = 5
const EMAIL_VERIFICATION_REQUEST_COOLDOWN_MS = 60 * 1000
const EMAIL_SEND_TIMEOUT_MS = 10 * 1000
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS!
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME!

export const brevoSmtpOptions = {
    host: "smtp-relay.brevo.com",
    secure: false,
    port: 587,
    connectionTimeout: EMAIL_SEND_TIMEOUT_MS,
    greetingTimeout: EMAIL_SEND_TIMEOUT_MS,
    socketTimeout: EMAIL_SEND_TIMEOUT_MS,
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

function shouldUseBrevoApi() {
    return process.env.NODE_ENV === "production"
}

function getEmailErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message
    return "unknown email provider error"
}

function getBrevoApiKey() {
    const apiKey = process.env.BREVO_API_KEY
    if (!apiKey) {
        throw new Error("BREVO_API_KEY is not configured")
    }

    return apiKey
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

    async GenAndStoreEmailVerificationCode(userId: number) {
        const genCode = await this.generateEmailVerificationCode()
        const codeHash = await this.hashEmailVerificaitonCode(genCode)
        const expiresAt: Date = new Date(Date.now() + EMAIL_VERIFICATION_CODE_TTL_MINUTES * 60 * 1000)

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
            const toCompare = userCode.toString() + PEPPER

            for (const verificationCode of query) {
                if (Date.now() > verificationCode.expires_at.getTime()) continue
                if (await bcrypt.compare(toCompare, verificationCode.code_hash)) return true
            }

            return false
        } catch (error) {
            console.error(error)
            return false
        }
    },

    async requestEmailVerificationCode(userId: number, email: string) {
        const activeCode = await AuthQueries.getEmailVerificationCode(userId)
        const latestActiveCode = activeCode[0]
        if (latestActiveCode && Date.now() < latestActiveCode.expires_at.getTime()) {
            const createdAt = latestActiveCode.created_at?.getTime()
            if (createdAt && Date.now() - createdAt < EMAIL_VERIFICATION_REQUEST_COOLDOWN_MS) {
                return { statusCode: 200, message: "verification code already requested. Please check your email." }
            }
        }

        const storeCode = await this.GenAndStoreEmailVerificationCode(userId)
        if (!storeCode.code) {
            return { statusCode: 500, message: "could not create verification code" }
        }

        const emailResult = await this.sendEmail(email, storeCode.code)
        if (!emailResult.sent) {
            console.error(emailResult.error)
            return { statusCode: 502, message: "could not send verification email" }
        }

        return { statusCode: 201, message: "verification code sent!" }
    },

    async sendEmail(email: string, code: number) {
        if (shouldUseBrevoApi()) {
            return await this.sendEmailWithBrevoApi(email, code)
        }

        return await this.sendEmailWithSmtp(email, code)
    },

    async sendEmailWithSmtp(email: string, code: number) {
        try {
            await transporter.sendMail({
                from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM_ADDRESS}>`,
                to: email,
                subject: "Verification Code",
                text: `Your verification code is ${code}`
            })

            return { sent: true }
        } catch (error) {
            return { sent: false, error: `SMTP email failed: ${getEmailErrorMessage(error)}` }
        }
    },

    async sendEmailWithBrevoApi(email: string, code: number) {
        const body = {
            sender: {
                name: EMAIL_FROM_NAME,
                email: EMAIL_FROM_ADDRESS,
            },
            to: [{ email }],
            subject: "Verification Code",
            textContent: `Your verification code is ${code}`,
        }

        try {
            const response = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                    "accept": "application/json",
                    "api-key": getBrevoApiKey(),
                    "content-type": "application/json",
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(EMAIL_SEND_TIMEOUT_MS),
            })

            if (!response.ok) {
                const providerMessage = await response.text().catch(() => "")
                return { sent: false, error: `Brevo API email failed: ${response.status} ${providerMessage}` }
            }

            return { sent: true }
        } catch (error) {
            return { sent: false, error: `Brevo API email failed: ${getEmailErrorMessage(error)}` }
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
