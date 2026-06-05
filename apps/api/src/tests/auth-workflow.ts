import { afterEach, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"

process.env.JWT_SECRET ??= randomUUID()
process.env.COOKIE_SECRET ??= randomUUID()
process.env.NODE_ENV = "test"

const { default: Build } = await import("../app.js")
const { db } = await import("../db/client.js")
const { EmailVerification, Users } = await import("../db/schema.js")
const { AuthService } = await import("../modules/auth/auth.service.js")

function makeUser() {
  const id = randomUUID()

  return {
    name: `Student ${id}`,
    email: `student.${id}@example.com`,
    password: `Password-${id}`,
    updatedName: `Updated Student ${id}`,
    updatedPassword: `NewPassword-${id}`,
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

async function registerUser(app: ReturnType<typeof Build>, user: ReturnType<typeof makeUser>) {
  const response = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      name: user.name,
      email: user.email,
      password: user.password,
    },
  })

  assert.equal(response.statusCode, 201, response.body)

  return response
}

describe("auth workflow", { concurrency: false }, () => {
  let app: ReturnType<typeof Build>

  beforeEach(() => {
    app = Build()
  })

  afterEach(async () => {
    await app.close()
  })

  it("registers user, persists pending email verification, then confirms email", async () => {
    const user = makeUser()

    try {
      const registerResponse = await registerUser(app, user)

      assert.equal(registerResponse.json().message, "user created!")
      assert.equal(typeof registerResponse.json().user_id, "number")

      const createdUser = await getUserByEmail(user.email)
      assert.equal(createdUser.name, user.name)
      assert.equal(createdUser.email_verified, false)
      assert.notEqual(createdUser.password, user.password)

      const verification = await db.query.EmailVerification.findFirst({
        where: eq(EmailVerification.user_id, createdUser.id),
      })

      assert.ok(verification, "expected email verification record to be created during registration")
      assert.equal(verification.used, false)
      assert.ok(verification.expires_at > new Date())

      const confirmationResponse = await AuthService.emailConfirmation(createdUser.id)
      assert.deepEqual(confirmationResponse, { message: "email confirmed!" })

      const confirmedUser = await getUserByEmail(user.email)
      assert.equal(confirmedUser.email_verified, true)

      const usedVerification = await db.query.EmailVerification.findFirst({
        where: eq(EmailVerification.user_id, createdUser.id),
      })

      assert.equal(usedVerification?.used, true)
    } finally {
      await deleteUserByEmail(user.email)
    }
  })

  it("rejects duplicate registration for existing email", async () => {
    const user = makeUser()

    try {
      await registerUser(app, user)

      const duplicateResponse = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          name: user.name,
          email: user.email,
          password: user.password,
        },
      })

      assert.equal(duplicateResponse.statusCode, 409)
      assert.deepEqual(duplicateResponse.json(), {
        statusCode: 409,
        message: "user already logged in",
      })
    } finally {
      await deleteUserByEmail(user.email)
    }
  })

  it("logs in, reads current user, updates profile, updates password, and logs out", async () => {
    const user = makeUser()

    try {
      await registerUser(app, user)

      const createdUser = await getUserByEmail(user.email)
      await AuthService.emailConfirmation(createdUser.id)

      const loginResponse = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: user.email,
          password: user.password,
        },
      })

      assert.equal(loginResponse.statusCode, 200)
      assert.equal(loginResponse.json().name, user.name)

      const authCookie = getAccessToken(loginResponse.headers["set-cookie"])

      const meResponse = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { cookie: authCookie },
      })

      assert.equal(meResponse.statusCode, 200)
      assert.equal(meResponse.json().user.email, user.email)

      const profileResponse = await app.inject({
        method: "PATCH",
        url: "/auth/profile",
        headers: { cookie: authCookie },
        payload: { name: user.updatedName },
      })

      assert.equal(profileResponse.statusCode, 201)
      assert.equal(profileResponse.body, "profile name updated!")

      const passwordResponse = await app.inject({
        method: "PATCH",
        url: "/auth/password",
        headers: { cookie: authCookie },
        payload: { new_password: user.updatedPassword },
      })

      assert.equal(passwordResponse.statusCode, 201)
      assert.equal(passwordResponse.body, "password updated!")

      const oldPasswordResponse = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: user.email,
          password: user.password,
        },
      })

      assert.equal(oldPasswordResponse.statusCode, 401)
      assert.deepEqual(oldPasswordResponse.json(), {
        statusCode: 401,
        error: "wrong credentials",
      })

      const newPasswordResponse = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: user.email,
          password: user.updatedPassword,
        },
      })

      assert.equal(newPasswordResponse.statusCode, 200)
      assert.equal(newPasswordResponse.json().name, user.updatedName)

      const logoutResponse = await app.inject({
        method: "POST",
        url: "/auth/logout",
        headers: { cookie: authCookie },
      })

      assert.equal(logoutResponse.statusCode, 200)
      assert.deepEqual(logoutResponse.json(), { message: "you logged out." })
      assert.match(String(logoutResponse.headers["set-cookie"]), /access_token=;/)
    } finally {
      await deleteUserByEmail(user.email)
    }
  })

  it("rejects protected routes without login and rejects wrong credentials", async () => {
    const user = makeUser()

    try {
      const unauthenticatedMeResponse = await app.inject({
        method: "GET",
        url: "/auth/me",
      })

      assert.equal(unauthenticatedMeResponse.statusCode, 401)
      assert.deepEqual(unauthenticatedMeResponse.json(), { message: "not authenticated" })

      await registerUser(app, user)

      const createdUser = await getUserByEmail(user.email)
      await AuthService.emailConfirmation(createdUser.id)

      const missingUserResponse = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: `missing.${randomUUID()}@example.com`,
          password: user.password,
        },
      })

      assert.equal(missingUserResponse.statusCode, 401)
      assert.deepEqual(missingUserResponse.json(), {
        statusCode: 401,
        error: "wrong credentials",
      })

      const wrongPasswordResponse = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: user.email,
          password: `wrong-${randomUUID()}`,
        },
      })

      assert.equal(wrongPasswordResponse.statusCode, 401)
      assert.deepEqual(wrongPasswordResponse.json(), {
        statusCode: 401,
        error: "wrong credentials",
      })
    } finally {
      await deleteUserByEmail(user.email)
    }
  })

  it("blocks protected routes until email is verified", async () => {
    const user = makeUser()

    try {
      const registerResponse = await registerUser(app, user)

      const authCookie = getAccessToken(registerResponse.headers["set-cookie"])

      const meResponse = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { cookie: authCookie },
      })

      assert.equal(meResponse.statusCode, 403)
      assert.deepEqual(meResponse.json(), { message: "email not verified" })

      const codeRequestResponse = await app.inject({
        method: "POST",
        url: "/auth/email-code/request",
        headers: { cookie: authCookie },
      })

      assert.notEqual(codeRequestResponse.statusCode, 403)
    } finally {
      await deleteUserByEmail(user.email)
    }
  })
})
