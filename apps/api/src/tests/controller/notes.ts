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

type NotePayload = {
    id: string
    title: string
    content: string
}

function makeUser() {
    const id = randomUUID()

    return {
        name: `Notes Student ${id}`,
        email: `notes.student.${id}@example.com`,
    }
}

function makeNote(overrides: Partial<NotePayload> = {}) {
    return {
        id: randomUUID(),
        title: "Biology notes",
        content: "Cell structure summary",
        ...overrides,
    }
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

function assertNote(actual: Record<string, unknown>, expected: NotePayload) {
    assert.equal(actual.id, expected.id)
    assert.equal(actual.title, expected.title)
    assert.equal(actual.content, expected.content)
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

describe("notes controller", { concurrency: false }, () => {
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

    it("starts with an empty notes list for a user without notes", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/notes",
            headers: { cookie },
        })

        assert.equal(response.statusCode, 200)
        assert.deepEqual(response.json(), { notes: [] })
    })

    it("creates, reads, updates, and deletes notes through HTTP endpoints", async () => {
        const note = makeNote()

        const createResponse = await app.inject({
            method: "POST",
            url: "/notes",
            headers: { cookie },
            payload: note,
        })

        assert.equal(createResponse.statusCode, 201)
        assert.deepEqual(createResponse.json(), { message: "note created!" })

        const createdNotesResponse = await app.inject({
            method: "GET",
            url: "/notes",
            headers: { cookie },
        })

        assert.equal(createdNotesResponse.statusCode, 200)
        const createdNotes = createdNotesResponse.json().notes
        assert.equal(createdNotes.length, 1)
        assertNote(createdNotes[0], note)

        const updatedNote = makeNote({
            ...note,
            title: "Updated biology notes",
            content: "Updated cell structure summary",
        })

        const updateResponse = await app.inject({
            method: "PUT",
            url: "/notes",
            headers: { cookie },
            payload: updatedNote,
        })

        assert.equal(updateResponse.statusCode, 200)
        assert.deepEqual(updateResponse.json(), { message: "note updated!" })

        const updatedNotesResponse = await app.inject({
            method: "GET",
            url: "/notes",
            headers: { cookie },
        })

        assert.equal(updatedNotesResponse.statusCode, 200)
        const updatedNotes = updatedNotesResponse.json().notes
        assert.equal(updatedNotes.length, 1)
        assertNote(updatedNotes[0], updatedNote)

        const deleteResponse = await app.inject({
            method: "DELETE",
            url: "/notes",
            headers: { cookie },
            payload: { id: note.id },
        })

        assert.equal(deleteResponse.statusCode, 200)
        assert.deepEqual(deleteResponse.json(), { message: "note deleted!" })

        const emptyNotesResponse = await app.inject({
            method: "GET",
            url: "/notes",
            headers: { cookie },
        })

        assert.equal(emptyNotesResponse.statusCode, 200)
        assert.deepEqual(emptyNotesResponse.json(), { notes: [] })
    })

    it("does not expose another user's notes", async () => {
        const otherUser = makeUser()
        const otherDbUser = await createUser(otherUser)
        const otherCookie = authCookie(app, otherDbUser.id, otherUser.email)
        const note = makeNote({ title: "Private note" })

        try {
            const createResponse = await app.inject({
                method: "POST",
                url: "/notes",
                headers: { cookie: otherCookie },
                payload: note,
            })

            assert.equal(createResponse.statusCode, 201)

            const response = await app.inject({
                method: "GET",
                url: "/notes",
                headers: { cookie },
            })

            assert.equal(response.statusCode, 200)
            assert.deepEqual(response.json(), { notes: [] })
        } finally {
            await deleteUserByEmail(otherUser.email)
        }
    })

    it("rejects notes requests without authentication", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/notes",
        })

        assert.equal(response.statusCode, 401)
        assert.deepEqual(response.json(), { message: "not authenticated" })
    })

    it("rejects invalid create note payloads", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/notes",
            headers: { cookie },
            payload: {
                title: "Missing id",
                content: "Invalid payload",
            },
        })

        assert.equal(response.statusCode, 400)
    })

    it("returns 500 when notes loading fails", async () => {
        const response = await withExpectedErrorLogSilenced(async () => {
            return await app.inject({
                method: "GET",
                url: "/notes",
                headers: { cookie: invalidSubjectCookie(app, user.email) },
            })
        })

        assert.equal(response.statusCode, 500)
        assert.equal(response.body, "could not load notes")
    })

    it("returns 500 when note creation fails", async () => {
        const response = await withExpectedErrorLogSilenced(async () => {
            return await app.inject({
                method: "POST",
                url: "/notes",
                headers: { cookie: invalidSubjectCookie(app, user.email) },
                payload: makeNote(),
            })
        })

        assert.equal(response.statusCode, 500)
        assert.deepEqual(response.json(), { error: "could not create note." })
    })

    it("returns 500 when note update fails", async () => {
        const response = await withExpectedErrorLogSilenced(async () => {
            return await app.inject({
                method: "PUT",
                url: "/notes",
                headers: { cookie: invalidSubjectCookie(app, user.email) },
                payload: makeNote(),
            })
        })

        assert.equal(response.statusCode, 500)
        assert.deepEqual(response.json(), { error: "could not update note." })
    })

    it("returns 500 when note delete fails", async () => {
        const response = await withExpectedErrorLogSilenced(async () => {
            return await app.inject({
                method: "DELETE",
                url: "/notes",
                headers: { cookie: invalidSubjectCookie(app, user.email) },
                payload: { id: randomUUID() },
            })
        })

        assert.equal(response.statusCode, 500)
        assert.equal(response.body, "could not delete note.")
    })
})
