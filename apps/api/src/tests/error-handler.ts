import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"

process.env.JWT_SECRET ??= randomUUID()
process.env.COOKIE_SECRET ??= randomUUID()
process.env.SMTP_LOGIN ??= `smtp-login-${randomUUID()}`
process.env.SMTP_KEY ??= `smtp-key-${randomUUID()}`
process.env.NODE_ENV = "test"

const { default: Build } = await import("../app.js")
const { AuthQueries } = await import("../modules/auth/auth.queries.js")
const { ScheduleService } = await import("../modules/schedule/schedule.service.js")

type MutableRecord = Record<string, unknown>

const testUser = {
  id: 1,
  name: "Error Handler Student",
  email: "error-handler.student@example.com",
  password: "hashed-password",
  created_at: null,
  updated_at: null,
  email_verified: true,
}

function replaceMethod(target: MutableRecord, method: string, replacement: unknown) {
  const original = target[method]
  target[method] = replacement

  return () => {
    target[method] = original
  }
}

describe("error handler", { concurrency: false }, () => {
  const app = Build()
  const restoreFns: Array<() => void> = []
  let authCookie: string

  before(async () => {
    restoreFns.push(
      replaceMethod(AuthQueries, "getUserByEmail", async () => testUser),
      replaceMethod(ScheduleService, "getSchedule", async () => {
        throw new Error("Failed query: select * from private_table")
      }),
      replaceMethod(console as unknown as MutableRecord, "error", () => undefined),
    )

    await app.ready()
    authCookie = `access_token=${app.jwt.sign({ sub: testUser.id.toString(), email: testUser.email })}`
  })

  after(async () => {
    for (const restore of restoreFns.reverse()) restore()
    await app.close()
  })

  it("hides technical details from internal errors", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/schedule",
      headers: { cookie: authCookie },
    })

    assert.equal(response.statusCode, 500)
    assert.deepEqual(response.json(), { message: "Something went wrong. Please try again." })
    assert.doesNotMatch(response.body, /Failed query|private_table/)
  })
})
