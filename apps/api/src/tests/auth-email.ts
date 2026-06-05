import { after, afterEach, before, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"

process.env.JWT_SECRET ??= randomUUID()
process.env.COOKIE_SECRET ??= randomUUID()
process.env.SMTP_LOGIN ??= `smtp-login-${randomUUID()}`
process.env.SMTP_KEY ??= `smtp-key-${randomUUID()}`
process.env.NODE_ENV = "test"

const { default: Build } = await import("../app.js")
const { db } = await import("../db/client.js")
const { EmailVerification, Users } = await import("../db/schema.js")
const {
  AuthService,
  brevoSmtpOptions,
  setEmailTransporterForTesting,
} = await import("../modules/auth/auth.service.js")

type TestUser = ReturnType<typeof makeUser>
type SentEmail = {
  email: string
  code: number
}

type BrevoMessage = {
  from?: string
  to?: string
  subject?: string
  text?: string
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

describe("Brevo email sender", { concurrency: false }, () => {
  it("uses Brevo SMTP settings and sends verification email content", async () => {
    const messages: BrevoMessage[] = []
    const restoreTransporter = setEmailTransporterForTesting({
      sendMail: async (message: BrevoMessage) => {
        messages.push(message)
        return {}
      },
    } as Parameters<typeof setEmailTransporterForTesting>[0])

    try {
      assert.equal(brevoSmtpOptions.host, "smtp-relay.brevo.com")
      assert.equal(brevoSmtpOptions.port, 587)
      assert.equal(brevoSmtpOptions.secure, false)
      assert.equal(brevoSmtpOptions.auth.user, process.env.SMTP_LOGIN)
      assert.equal(brevoSmtpOptions.auth.pass, process.env.SMTP_KEY)

      await AuthService.sendEmail("student@example.com", 12345)

      assert.deepEqual(messages, [
        {
          from: '"Studium" <noreply@studium-web.com>',
          to: "student@example.com",
          subject: "Verification Code",
          text: "Your verication code is 12345",
        },
      ])
    } finally {
      restoreTransporter()
    }
  })
})

describe("auth email verification workflow", { concurrency: false }, () => {
  let app: ReturnType<typeof Build>
  const sentEmails: SentEmail[] = []
  let restoreSendEmail: (() => void) | undefined

  before(() => {
    const originalSendEmail = AuthService.sendEmail
    AuthService.sendEmail = async (email: string, code: number) => {
      sentEmails.push({ email, code })
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

  it("sends verification emails to multiple users at the same time", async () => {
    const testUsers = Array.from({ length: 3 }, () => makeUser())

    try {
      await Promise.all(testUsers.map((user) => registerUser(app, user)))

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

  it("requests code twice and only accepts the newest code", async () => {
    const { user, cookie } = await registerUser(app)

    try {
      const firstCode = sentEmails.at(-1)!.code

      const resendResponse = await app.inject({
        method: "POST",
        url: "/auth/email-code/request",
        headers: { cookie },
      })

      assert.equal(resendResponse.statusCode, 201)
      assert.deepEqual(resendResponse.json(), { message: "verification code sent!" })

      const secondCode = sentEmails.at(-1)!.code
      assert.equal(sentEmails.length, 2)

      const firstCodeResponse = await app.inject({
        method: "POST",
        url: "/auth/email-code",
        headers: { cookie },
        payload: { userCode: firstCode },
      })

      assert.equal(firstCodeResponse.statusCode, 403)

      const secondCodeResponse = await app.inject({
        method: "POST",
        url: "/auth/email-code",
        headers: { cookie },
        payload: { userCode: secondCode },
      })

      assert.equal(secondCodeResponse.statusCode, 200)
      assert.deepEqual(secondCodeResponse.json(), { message: "email confirmed!" })
    } finally {
      await deleteUserByEmail(user.email)
    }
  })

  it("rejects wrong code", async () => {
    const { user, cookie } = await registerUser(app)

    try {
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
        const response = await app.inject({
          method: "POST",
          url: "/auth/email-code/request",
          headers: { cookie },
        })

        assert.equal(response.statusCode, 201)
      }

      assert.equal(sentEmails.length, 4)

      const limitedResponse = await app.inject({
        method: "POST",
        url: "/auth/email-code/request",
        headers: { cookie },
      })

      assert.equal(limitedResponse.statusCode, 429)
      assert.equal(sentEmails.length, 4)

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
