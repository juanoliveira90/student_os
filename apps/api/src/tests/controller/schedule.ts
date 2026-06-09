import { afterEach, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"

process.env.JWT_SECRET ??= randomUUID()
process.env.COOKIE_SECRET ??= randomUUID()
process.env.NODE_ENV = "test"

const { default: Build } = await import("../../app.js")
const { db } = await import("../../db/client.js")
const { Users } = await import("../../db/schema.js")

function makeUser() {
    const id = randomUUID()

    return {
        name: `Schedule Student ${id}`,
        email: `schedule.student.${id}@example.com`,
    }
}

function makeEvent(overrides: Partial<ScheduleEvent> = {}) {
    return {
        id: randomUUID(),
        day_of_week: "Monday",
        title: "Study biology",
        tag: "biology",
        description: "Cell structure review",
        start_time: "09:00",
        start_period: "AM",
        end_time: "10:00",
        end_period: "AM",
        ...overrides,
    }
}

type ScheduleEvent = {
    id: string
    day_of_week: string
    title: string
    tag?: string
    description?: string | null
    start_time: string
    start_period: string
    end_time: string
    end_period: string
}

async function createUser(user: ReturnType<typeof makeUser>) {
    const insertedUsers = await db.insert(Users).values({
        name: user.name,
        email: user.email,
        email_verified: true,
    }).returning({ id: Users.id })

    const insertedUser = insertedUsers[0]
    assert.ok(insertedUser, "expected test user to be inserted")

    return insertedUser
}

async function deleteUserByEmail(email: string) {
    await db.delete(Users).where(eq(Users.email, email))
}

function authCookie(app: ReturnType<typeof Build>, userId: number, email: string) {
    return `access_token=${app.jwt.sign({ sub: userId.toString(), email })}`
}

function invalidSubjectCookie(app: ReturnType<typeof Build>, email: string) {
    return `access_token=${app.jwt.sign({ sub: "not-a-number", email })}`
}

function assertScheduleEvent(actual: Record<string, unknown>, expected: ScheduleEvent) {
    assert.equal(actual.id, expected.id)
    assert.equal(actual.day_of_week, expected.day_of_week)
    assert.equal(actual.title, expected.title)
    assert.equal(actual.tag, expected.tag)
    assert.equal(actual.description, expected.description)
    assert.match(String(actual.start_time), /^09:00/)
    assert.equal(actual.start_period, expected.start_period)
    assert.match(String(actual.end_time), /^10:00/)
    assert.equal(actual.end_period, expected.end_period)
}

async function withExpectedErrorLogSilenced<T>(callback: () => Promise<T>) {
    const originalConsoleError = console.error
    console.error = () => undefined

    try {
        return await callback()
    } finally {
        console.error = originalConsoleError
    }
}

describe("schedule controller", { concurrency: false }, () => {
    let app: ReturnType<typeof Build>
    let user: ReturnType<typeof makeUser>
    let cookie: string

    beforeEach(async () => {
        app = Build()
        await app.ready()

        user = makeUser()
        const dbUser = await createUser(user)
        cookie = authCookie(app, dbUser.id, user.email)
    })

    afterEach(async () => {
        await deleteUserByEmail(user.email)
        await app.close()
    })

    it("starts with an empty schedule for a user without events", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/schedule",
            headers: { cookie },
        })

        assert.equal(response.statusCode, 200)
        assert.deepEqual(response.json(), { events: [] })
    })

    it("creates, reads, updates, and deletes schedule events through HTTP endpoints", async () => {
        const event = makeEvent()

        const createResponse = await app.inject({
            method: "PUT",
            url: "/schedule",
            headers: { cookie },
            payload: { events: [event] },
        })

        assert.equal(createResponse.statusCode, 201)
        assert.equal(createResponse.body, "schedule updated!")

        const createdScheduleResponse = await app.inject({
            method: "GET",
            url: "/schedule",
            headers: { cookie },
        })

        assert.equal(createdScheduleResponse.statusCode, 200)
        const createdEvents = createdScheduleResponse.json().events
        assert.equal(createdEvents.length, 1)
        assertScheduleEvent(createdEvents[0], event)

        const updatedEvent = makeEvent({
            ...event,
            title: "Review chemistry",
            tag: "chemistry",
            description: null,
        })

        const updateResponse = await app.inject({
            method: "PUT",
            url: "/schedule",
            headers: { cookie },
            payload: { events: [updatedEvent] },
        })

        assert.equal(updateResponse.statusCode, 201)
        assert.equal(updateResponse.body, "schedule updated!")

        const updatedScheduleResponse = await app.inject({
            method: "GET",
            url: "/schedule",
            headers: { cookie },
        })

        assert.equal(updatedScheduleResponse.statusCode, 200)
        const updatedEvents = updatedScheduleResponse.json().events
        assert.equal(updatedEvents.length, 1)
        assertScheduleEvent(updatedEvents[0], updatedEvent)

        const deleteResponse = await app.inject({
            method: "DELETE",
            url: "/schedule/delete",
            headers: { cookie },
            payload: { events: [{ id: event.id }] },
        })

        assert.equal(deleteResponse.statusCode, 200)
        assert.equal(deleteResponse.body, "event deleted!")

        const emptyScheduleResponse = await app.inject({
            method: "GET",
            url: "/schedule",
            headers: { cookie },
        })

        assert.equal(emptyScheduleResponse.statusCode, 200)
        assert.deepEqual(emptyScheduleResponse.json(), { events: [] })
    })

    it("does not expose another user's schedule events", async () => {
        const otherUser = makeUser()
        const otherDbUser = await createUser(otherUser)
        const otherCookie = authCookie(app, otherDbUser.id, otherUser.email)
        const event = makeEvent({ title: "Private event" })

        try {
            const createResponse = await app.inject({
                method: "PUT",
                url: "/schedule",
                headers: { cookie: otherCookie },
                payload: { events: [event] },
            })

            assert.equal(createResponse.statusCode, 201)

            const response = await app.inject({
                method: "GET",
                url: "/schedule",
                headers: { cookie },
            })

            assert.equal(response.statusCode, 200)
            assert.deepEqual(response.json(), { events: [] })
        } finally {
            await deleteUserByEmail(otherUser.email)
        }
    })

    it("rejects schedule requests without authentication", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/schedule",
        })

        assert.equal(response.statusCode, 401)
        assert.deepEqual(response.json(), { message: "not authenticated" })
    })

    it("rejects invalid update payloads", async () => {
        const response = await app.inject({
            method: "PUT",
            url: "/schedule",
            headers: { cookie },
            payload: {
                events: [
                    {
                        id: randomUUID(),
                        title: "Missing required fields",
                    },
                ],
            },
        })

        assert.equal(response.statusCode, 400)
    })

    it("returns 500 when schedule loading fails", async () => {
        const response = await withExpectedErrorLogSilenced(async () => {
            return await app.inject({
                method: "GET",
                url: "/schedule",
                headers: { cookie: invalidSubjectCookie(app, user.email) },
            })
        })

        assert.equal(response.statusCode, 500)
        assert.equal(response.body, "could not load schedule")
    })

    it("returns 500 when schedule update fails", async () => {
        const response = await withExpectedErrorLogSilenced(async () => {
            return await app.inject({
                method: "PUT",
                url: "/schedule",
                headers: { cookie: invalidSubjectCookie(app, user.email) },
                payload: { events: [makeEvent()] },
            })
        })

        assert.equal(response.statusCode, 500)
        assert.equal(response.body, "nothing was changed")
    })

    it("returns 500 when schedule delete fails", async () => {
        const response = await withExpectedErrorLogSilenced(async () => {
            return await app.inject({
                method: "DELETE",
                url: "/schedule/delete",
                headers: { cookie: invalidSubjectCookie(app, user.email) },
                payload: { events: [{ id: randomUUID() }] },
            })
        })

        assert.equal(response.statusCode, 500)
        assert.equal(response.body, "nothing was changed")
    })
})
