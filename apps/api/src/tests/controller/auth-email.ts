import { after, afterEach, before, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"

process.env.JWT_SECRET ??= randomUUID()
process.env.COOKIE_SECRET ??= randomUUID()
process.env.SMTP_LOGIN ??= `smtp-login-${randomUUID()}`
process.env.SMTP_KEY ??= `smtp-key-${randomUUID()}`
process.env.NODE_ENV = "test"

const { default: Build } = await import("../../app.js")
const { db } = await import("../../db/client.js")
const { EmailVerification, Users } = await import("../../db/schema.js")
const { AuthService } = await import("../../modules/auth/auth.service.js")

type TestUser = ReturnType<typeof makeUser>
type SentEmail = {
    email: string
    code: number
}

function makeUser() {
    const id = randomUUID()

    return {
        name: `Student ${id}`,
        email: `student.${id}@example.com`,
        password: `Password-${id}`,
    }
}

async function deleteUserByEmail(email: string) {
    await db.delete(Users).where(eq(Users.email, email))
}

async function getUserByEmail(email: string) {
    const user = await db.query.Users.findFirst({
        where: eq(Users.email, email),
    })

    assert.ok(user, `expected user ${email} to exist`)

    return user
}

function getAccessToken(setCookie: string | string[] | undefined) {
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie
    assert.ok(cookie, "expected access_token cookie")

    const token = cookie
        .split(";")
        .find((part) => part.trim().startsWith("access_token="))
        ?.split("=")[1]

    assert.ok(token, "expected access_token value")

    return `access_token=${token}`
}

async function registerUser(app: ReturnType<typeof Build>, user = makeUser()) {
    const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
            name: user.name,
            email: user.email,
            password: user.password,
        },
    })

    assert.equal(response.statusCode, 201)

    return {
        user,
        cookie: getAccessToken(response.headers["set-cookie"]),
        dbUser: await getUserByEmail(user.email),
    }
}

function wrongCodeFor(code: number) {
    return code === 99999 ? 10000 : code + 1
}

describe("auth email verification workflow", { concurrency: false }, () => {
    let app: ReturnType<typeof Build>
    const sentEmails: SentEmail[] = []
    let restoreSendEmail: (() => void) | undefined

    before(() => {
        const originalSendEmail = AuthService.sendEmail
        AuthService.sendEmail = async (email: string, code: number) => {
            sentEmails.push({ email, code })
            return { sent: true }
        }
        restoreSendEmail = () => {
            AuthService.sendEmail = originalSendEmail
        }
    })

    beforeEach(() => {
        app = Build()
        sentEmails.length = 0
    })

    afterEach(async () => {
        await app.close()
    })

    after(() => {
        restoreSendEmail?.()
    })

    async function requestCode(cookie: string) {
        return await app.inject({
            method: "POST",
            url: "/auth/email-code/request",
            headers: { cookie },
        })
    }

    it("sends verification emails to multiple users at the same time", async () => {
        const testUsers = Array.from({ length: 3 }, () => makeUser())

        try {
            const registeredUsers = await Promise.all(testUsers.map((user) => registerUser(app, user)))
            const requestResponses = await Promise.all(registeredUsers.map((registeredUser) => requestCode(registeredUser.cookie)))

            assert.ok(requestResponses.every((response) => response.statusCode === 201))
            assert.equal(sentEmails.length, testUsers.length)
            assert.deepEqual(
                sentEmails.map((email) => email.email).sort(),
                testUsers.map((user) => user.email).sort(),
            )
            assert.ok(sentEmails.every((email) => email.code >= 10000 && email.code <= 99999))
        } finally {
            await Promise.all(testUsers.map((user) => deleteUserByEmail(user.email)))
        }
    })

    it("does not create another code during the request cooldown", async () => {
        const { user, cookie } = await registerUser(app)

        try {
            const requestResponse = await requestCode(cookie)
            assert.equal(requestResponse.statusCode, 201)

            const firstCode = sentEmails.at(-1)!.code

            const resendResponse = await requestCode(cookie)

            assert.equal(resendResponse.statusCode, 200)
            assert.deepEqual(resendResponse.json(), { message: "verification code already requested. Please check your email." })
            assert.equal(sentEmails.length, 1)

            const firstCodeResponse = await app.inject({
                method: "POST",
                url: "/auth/email-code",
                headers: { cookie },
                payload: { userCode: firstCode },
            })

            assert.equal(firstCodeResponse.statusCode, 200)
            assert.deepEqual(firstCodeResponse.json(), { message: "email confirmed!" })
        } finally {
            await deleteUserByEmail(user.email)
        }
    })

    it("rejects wrong code", async () => {
        const { user, cookie } = await registerUser(app)

        try {
            await requestCode(cookie)

            const response = await app.inject({
                method: "POST",
                url: "/auth/email-code",
                headers: { cookie },
                payload: { userCode: wrongCodeFor(sentEmails.at(-1)!.code) },
            })

            assert.equal(response.statusCode, 403)
            assert.deepEqual(response.json(), { message: "wrong code!" })
        } finally {
            await deleteUserByEmail(user.email)
        }
    })

    it("rejects expired code", async () => {
        const { user, cookie, dbUser } = await registerUser(app)

        try {
            await requestCode(cookie)

            await db.update(EmailVerification)
                .set({ expires_at: new Date(Date.now() - 60_000) })
                .where(eq(EmailVerification.user_id, dbUser.id))

            const response = await app.inject({
                method: "POST",
                url: "/auth/email-code",
                headers: { cookie },
                payload: { userCode: sentEmails.at(-1)!.code },
            })

            assert.equal(response.statusCode, 403)
            assert.deepEqual(response.json(), { message: "wrong code!" })
        } finally {
            await deleteUserByEmail(user.email)
        }
    })

    it("rate-limits code requests from the same user", async () => {
        const { user, cookie } = await registerUser(app)

        try {
            for (let index = 0; index < 3; index += 1) {
                const response = await requestCode(cookie)

                assert.ok([200, 201].includes(response.statusCode))
            }

            assert.equal(sentEmails.length, 1)

            const limitedResponse = await requestCode(cookie)

            assert.equal(limitedResponse.statusCode, 429)
            assert.equal(sentEmails.length, 1)

            const latestCodeResponse = await app.inject({
                method: "POST",
                url: "/auth/email-code",
                headers: { cookie },
                payload: { userCode: sentEmails.at(-1)!.code },
            })

            assert.equal(latestCodeResponse.statusCode, 200)
            assert.deepEqual(latestCodeResponse.json(), { message: "email confirmed!" })
        } finally {
            await deleteUserByEmail(user.email)
        }
    })

    it("rejects resend after verification", async () => {
        const { user, cookie } = await registerUser(app)

        try {
            await requestCode(cookie)

            const verificationResponse = await app.inject({
                method: "POST",
                url: "/auth/email-code",
                headers: { cookie },
                payload: { userCode: sentEmails.at(-1)!.code },
            })

            assert.equal(verificationResponse.statusCode, 200)
            sentEmails.length = 0

            const resendResponse = await app.inject({
                method: "POST",
                url: "/auth/email-code/request",
                headers: { cookie },
            })

            assert.equal(resendResponse.statusCode, 409)
            assert.deepEqual(resendResponse.json(), { message: "email already confirmed" })
            assert.equal(sentEmails.length, 0)
        } finally {
            await deleteUserByEmail(user.email)
        }
    })

    it("rejects same code reused", async () => {
        const { user, cookie } = await registerUser(app)

        try {
            await requestCode(cookie)

            const code = sentEmails.at(-1)!.code

            const firstResponse = await app.inject({
                method: "POST",
                url: "/auth/email-code",
                headers: { cookie },
                payload: { userCode: code },
            })

            assert.equal(firstResponse.statusCode, 200)

            const secondResponse = await app.inject({
                method: "POST",
                url: "/auth/email-code",
                headers: { cookie },
                payload: { userCode: code },
            })

            assert.equal(secondResponse.statusCode, 403)
            assert.deepEqual(secondResponse.json(), { message: "wrong code!" })
        } finally {
            await deleteUserByEmail(user.email)
        }
    })
})
