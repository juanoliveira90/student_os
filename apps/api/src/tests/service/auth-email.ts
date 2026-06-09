import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"

process.env.JWT_SECRET ??= randomUUID()
process.env.COOKIE_SECRET ??= randomUUID()
process.env.SMTP_LOGIN ??= `smtp-login-${randomUUID()}`
process.env.SMTP_KEY ??= `smtp-key-${randomUUID()}`
process.env.NODE_ENV = "test"

const {
    AuthService,
    brevoSmtpOptions,
    setEmailTransporterForTesting,
} = await import("../../modules/auth/auth.service.js")

type BrevoMessage = {
    from?: string
    to?: string
    subject?: string
    text?: string
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
                    text: "Your verification code is 12345",
                },
            ])
        } finally {
            restoreTransporter()
        }
    })
})
