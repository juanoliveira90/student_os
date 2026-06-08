import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"

process.env.JWT_SECRET ??= randomUUID()
process.env.COOKIE_SECRET ??= randomUUID()
process.env.NODE_ENV = "test"

const { default: Build } = await import("../../app.js")
const { AuthQueries } = await import("../../modules/auth/auth.queries.js")
const { NotesService } = await import("../../modules/notes/notes.service.js")

type MutableRecord = Record<string, unknown>

const testUser = {
    id: 42,
    name: "Notes Controller Student",
    email: "notes.controller@example.com",
    password: "hashed-password",
    created_at: null,
    updated_at: null,
    email_verified: true,
}

const notePayload = {
    id: "note-1",
    title: "Biology notes",
    content: "Cell structure summary",
}

function replaceMethod(target: MutableRecord, method: string, replacement: unknown) {
    const original = target[method]
    target[method] = replacement

    return () => {
        target[method] = original
    }
}

describe("notes controller", { concurrency: false }, () => {
    const app = Build()
    const restoreFns: Array<() => void> = []
    const calls: Array<{ method: string, userId: number, data?: unknown }> = []
    let authCookie: string

    before(async () => {
        restoreFns.push(
            replaceMethod(AuthQueries, "getUserByEmail", async () => testUser),
            replaceMethod(NotesService, "getNotes", async (userId: number) => {
                calls.push({ method: "getNotes", userId })
                return { notes: [notePayload] }
            }),
            replaceMethod(NotesService, "createNote", async (userId: number, data: unknown) => {
                calls.push({ method: "createNote", userId, data })
                return { message: "note created!" }
            }),
            replaceMethod(NotesService, "updateNote", async (userId: number, data: unknown) => {
                calls.push({ method: "updateNote", userId, data })
                return { message: "note updated!" }
            }),
            replaceMethod(NotesService, "deleteNote", async (userId: number, data: unknown) => {
                calls.push({ method: "deleteNote", userId, data })
                return { message: "note deleted!" }
            }),
        )

        await app.ready()
        authCookie = `access_token=${app.jwt.sign({ sub: testUser.id.toString(), email: testUser.email })}`
    })

    after(async () => {
        for (const restore of restoreFns.reverse()) restore()
        await app.close()
    })

    it("gets notes for the authenticated user", async () => {
        calls.length = 0

        const response = await app.inject({
            method: "GET",
            url: "/notes",
            headers: { cookie: authCookie },
        })

        assert.equal(response.statusCode, 200)
        assert.deepEqual(response.json(), { notes: [notePayload] })
        assert.deepEqual(calls, [{ method: "getNotes", userId: testUser.id }])
    })

    it("creates a note for the authenticated user", async () => {
        calls.length = 0

        const response = await app.inject({
            method: "POST",
            url: "/notes",
            headers: { cookie: authCookie },
            payload: notePayload,
        })

        assert.equal(response.statusCode, 201)
        assert.deepEqual(response.json(), { message: "note created!" })
        assert.deepEqual(calls, [{ method: "createNote", userId: testUser.id, data: notePayload }])
    })

    it("updates a note for the authenticated user", async () => {
        calls.length = 0

        const response = await app.inject({
            method: "PUT",
            url: "/notes",
            headers: { cookie: authCookie },
            payload: {
                ...notePayload,
                title: "Updated biology notes",
            },
        })

        assert.equal(response.statusCode, 200)
        assert.deepEqual(response.json(), { message: "note updated!" })
        assert.deepEqual(calls, [
            {
                method: "updateNote",
                userId: testUser.id,
                data: {
                    ...notePayload,
                    title: "Updated biology notes",
                },
            },
        ])
    })

    it("deletes a note for the authenticated user", async () => {
        calls.length = 0

        const response = await app.inject({
            method: "DELETE",
            url: "/notes",
            headers: { cookie: authCookie },
            payload: { id: notePayload.id },
        })

        assert.equal(response.statusCode, 200)
        assert.deepEqual(response.json(), { message: "note deleted!" })
        assert.deepEqual(calls, [{ method: "deleteNote", userId: testUser.id, data: { id: notePayload.id } }])
    })

    it("rejects notes requests without authentication", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/notes",
        })

        assert.equal(response.statusCode, 401)
        assert.deepEqual(response.json(), { message: "not authenticated" })
    })

    it("rejects invalid create note payloads before calling the service", async () => {
        calls.length = 0

        const response = await app.inject({
            method: "POST",
            url: "/notes",
            headers: { cookie: authCookie },
            payload: {
                title: "Missing id",
                content: "Invalid payload",
            },
        })

        assert.equal(response.statusCode, 400)
        assert.deepEqual(calls, [])
    })
})
