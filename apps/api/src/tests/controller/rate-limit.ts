import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"

process.env.JWT_SECRET ??= randomUUID()
process.env.COOKIE_SECRET ??= randomUUID()
process.env.SMTP_LOGIN ??= `smtp-login-${randomUUID()}`
process.env.SMTP_KEY ??= `smtp-key-${randomUUID()}`
process.env.NODE_ENV = "test"

const { default: Build } = await import("../../app.js")
const { AuthQueries } = await import("../../modules/auth/auth.queries.js")
const { AuthService } = await import("../../modules/auth/auth.service.js")
const { NotesService } = await import("../../modules/notes/notes.service.js")
const { ScheduleService } = await import("../../modules/schedule/schedule.service.js")
const { StudyPlanService } = await import("../../modules/studyPlan/studyPlan.service.js")

type MutableRecord = Record<string, unknown>

type RateLimitCase = {
    name: string
    max: number
    request: () => Record<string, unknown>
}

const testUser = {
    id: 1,
    name: "Rate Limit Student",
    email: "rate-limit.student@example.com",
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

async function expectRateLimit(app: ReturnType<typeof Build>, testCase: RateLimitCase) {
    const inject = app.inject as unknown as (options: Record<string, unknown>) => Promise<{ statusCode: number }>

    for (let attempt = 0; attempt < testCase.max; attempt += 1) {
        const response = await inject(testCase.request())
        assert.notEqual(
            response.statusCode,
            429,
            `${testCase.name} should allow request ${attempt + 1}`,
        )
    }

    const limitedResponse = await inject(testCase.request())
    assert.equal(limitedResponse.statusCode, 429, `${testCase.name} should rate-limit request ${testCase.max + 1}`)
}

describe("endpoint rate limiting", { concurrency: false }, () => {
    const app = Build()
    const restoreFns: Array<() => void> = []
    let authCookie: string

    before(async () => {
        restoreFns.push(
            replaceMethod(AuthQueries, "getUserByEmail", async () => testUser),
            replaceMethod(AuthService, "register", async () => ({ user_id: testUser.id, message: "user created!" })),
            replaceMethod(AuthService, "storeEmailVerificationCode", async () => ({
                code: 12345,
                message: "code stored in database!",
            })),
            replaceMethod(AuthService, "sendEmail", async () => undefined),
            replaceMethod(AuthService, "requestEmailVerificationCode", async () => ({
                statusCode: 201,
                message: "verification code sent!",
            })),
            replaceMethod(AuthService, "validateEmailVerificationCodeFromUser", async () => false),
            replaceMethod(AuthService, "emailConfirmation", async () => ({ message: "email confirmed!" })),
            replaceMethod(AuthService, "login", async () => ({
                id: testUser.id,
                name: testUser.name,
                email: testUser.email,
            })),
            replaceMethod(AuthService, "userInformation", async () => ({
                id: testUser.id,
                name: testUser.name,
                email: testUser.email,
            })),
            replaceMethod(AuthService, "updateProfile", async () => ({
                statusCode: 201,
                message: "profile name updated!",
            })),
            replaceMethod(AuthService, "updatePassword", async () => ({
                statusCode: 201,
                message: "password updated!",
            })),
            replaceMethod(ScheduleService, "getSchedule", async () => ({ events: [] })),
            replaceMethod(ScheduleService, "updateSchedule", async () => ({ message: "schedule updated!" })),
            replaceMethod(ScheduleService, "deleteEvent", async () => ({ message: "event deleted!" })),
            replaceMethod(StudyPlanService, "getStudyPlans", async () => ({ plans: [] })),
            replaceMethod(StudyPlanService, "createSubject", async () => ({ message: "subject created!" })),
            replaceMethod(StudyPlanService, "addSubtask", async () => ({ message: "subtask(s) created!" })),
            replaceMethod(StudyPlanService, "deleteSubtask", async () => ({ message: "subtask deleted!" })),
            replaceMethod(StudyPlanService, "deleteSubject", async () => ({ message: "subject deleted!" })),
            replaceMethod(StudyPlanService, "updateSubject", async () => ({ message: "subject updated!" })),
            replaceMethod(StudyPlanService, "updateSubtask", async () => ({ message: "subtask updated!" })),
            replaceMethod(NotesService, "getNotes", async () => ({ notes: [] })),
            replaceMethod(NotesService, "createNote", async () => ({ message: "note created!" })),
            replaceMethod(NotesService, "updateNote", async () => ({ message: "note updated!" })),
            replaceMethod(NotesService, "deleteNote", async () => ({ message: "note deleted!" })),
        )

        await app.ready()
        authCookie = `access_token=${app.jwt.sign({ sub: testUser.id.toString(), email: testUser.email })}`
    })

    after(async () => {
        for (const restore of restoreFns.reverse()) restore()
        await app.close()
    })

    const eventPayload = {
        events: [
            {
                id: "event-1",
                day_of_week: "Monday",
                title: "Study",
                start_time: "09:00",
                start_period: "AM",
                end_time: "10:00",
                end_period: "AM",
            },
        ],
    }

    const authenticatedCases: RateLimitCase[] = [
        { name: "POST /auth/email-code/request", max: 3, request: () => ({ method: "POST", url: "/auth/email-code/request", headers: { cookie: authCookie } }) },
        { name: "POST /auth/email-code", max: 5, request: () => ({ method: "POST", url: "/auth/email-code", headers: { cookie: authCookie }, payload: { userCode: 11111 } }) },
        { name: "GET /schedule", max: 60, request: () => ({ method: "GET", url: "/schedule", headers: { cookie: authCookie } }) },
        { name: "PUT /schedule", max: 40, request: () => ({ method: "PUT", url: "/schedule", headers: { cookie: authCookie }, payload: eventPayload }) },
        { name: "DELETE /schedule/delete", max: 15, request: () => ({ method: "DELETE", url: "/schedule/delete", headers: { cookie: authCookie }, payload: { events: [{ id: "event-1" }] } }) },
        { name: "GET /plan", max: 60, request: () => ({ method: "GET", url: "/plan", headers: { cookie: authCookie } }) },
        { name: "POST /plan/subject", max: 20, request: () => ({ method: "POST", url: "/plan/subject", headers: { cookie: authCookie }, payload: { id: "subject-1", name: "Math" } }) },
        { name: "POST /plan/subtask", max: 20, request: () => ({ method: "POST", url: "/plan/subtask", headers: { cookie: authCookie }, payload: { subject_id: "subject-1", subtasks: [{ id: "subtask-1", name: "Read" }] } }) },
        { name: "DELETE /plan/subtask", max: 15, request: () => ({ method: "DELETE", url: "/plan/subtask", headers: { cookie: authCookie }, payload: { id: "subtask-1" } }) },
        { name: "DELETE /plan/subject", max: 15, request: () => ({ method: "DELETE", url: "/plan/subject", headers: { cookie: authCookie }, payload: { id: "subject-1" } }) },
        { name: "PUT /plan/subject", max: 30, request: () => ({ method: "PUT", url: "/plan/subject", headers: { cookie: authCookie }, payload: { id: "subject-1", name: "Math" } }) },
        { name: "PUT /plan/subtask", max: 30, request: () => ({ method: "PUT", url: "/plan/subtask", headers: { cookie: authCookie }, payload: { id: "subtask-1", name: "Read", done: false } }) },
        { name: "GET /notes", max: 60, request: () => ({ method: "GET", url: "/notes", headers: { cookie: authCookie } }) },
        { name: "POST /notes", max: 20, request: () => ({ method: "POST", url: "/notes", headers: { cookie: authCookie }, payload: { id: "note-1", title: "Note", content: "Body" } }) },
        { name: "PUT /notes", max: 30, request: () => ({ method: "PUT", url: "/notes", headers: { cookie: authCookie }, payload: { id: "note-1", title: "Note", content: "Body" } }) },
        { name: "DELETE /notes", max: 15, request: () => ({ method: "DELETE", url: "/notes", headers: { cookie: authCookie }, payload: { id: "note-1" } }) },
    ]

    it("limits public auth endpoints", async () => {
        await expectRateLimit(app, {
            name: "POST /auth/register",
            max: 3,
            request: () => ({
                method: "POST",
                url: "/auth/register",
                payload: {
                    name: "Rate Limit Student",
                    email: "rate-limit-register@example.com",
                    password: "Password-1",
                },
            }),
        })

        await expectRateLimit(app, {
            name: "POST /auth/login",
            max: 5,
            request: () => ({
                method: "POST",
                url: "/auth/login",
                payload: {
                    email: testUser.email,
                    password: "Password-1",
                },
            }),
        })
    })

    for (const testCase of authenticatedCases) {
        it(`limits ${testCase.name}`, async () => {
            await expectRateLimit(app, testCase)
        })
    }
})
