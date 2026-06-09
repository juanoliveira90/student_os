import { afterEach, describe, it } from "node:test"
import assert from "node:assert/strict"

const { NotesQueries } = await import("../../modules/notes/notes.queries.js")
const { NotesService } = await import("../../modules/notes/notes.service.js")

type MutableRecord = Record<string, unknown>

const userId = 42
const notePayload = {
    id: "note-1",
    title: "Biology notes",
    content: "Cell structure summary",
}

const restoreFns: Array<() => void> = []

function replaceMethod(target: MutableRecord, method: string, replacement: unknown) {
    const original = target[method]
    target[method] = replacement

    const restore = () => {
        target[method] = original
    }

    restoreFns.push(restore)
    return restore
}

describe("notes service", { concurrency: false }, () => {
    afterEach(() => {
        for (const restore of restoreFns.reverse()) restore()
        restoreFns.length = 0
    })

    it("loads notes for a user", async () => {
        replaceMethod(NotesQueries, "getNotes", async (receivedUserId: number) => {
            assert.equal(receivedUserId, userId)
            return [notePayload]
        })

        const result = await NotesService.getNotes(userId)

        assert.deepEqual(result, { notes: [notePayload] })
    })

    it("returns a service error when notes cannot be loaded", async () => {
        replaceMethod(NotesQueries, "getNotes", async () => {
            throw new Error("database unavailable")
        })
        replaceMethod(console as unknown as MutableRecord, "error", () => undefined)

        const result = await NotesService.getNotes(userId)

        assert.deepEqual(result, { error: "could not load notes" })
    })

    it("creates a note for a user", async () => {
        replaceMethod(NotesQueries, "createNote", async (receivedUserId: number, data: typeof notePayload) => {
            assert.equal(receivedUserId, userId)
            assert.deepEqual(data, notePayload)
        })

        const result = await NotesService.createNote(userId, notePayload)

        assert.deepEqual(result, { message: "note created!" })
    })

    it("returns a service error when a note cannot be created", async () => {
        replaceMethod(NotesQueries, "createNote", async () => {
            throw new Error("insert failed")
        })
        replaceMethod(console as unknown as MutableRecord, "error", () => undefined)

        const result = await NotesService.createNote(userId, notePayload)

        assert.deepEqual(result, { error: "could not create note." })
    })

    it("updates a note for a user", async () => {
        replaceMethod(NotesQueries, "updateNote", async (receivedUserId: number, data: typeof notePayload) => {
            assert.equal(receivedUserId, userId)
            assert.deepEqual(data, notePayload)
        })

        const result = await NotesService.updateNote(userId, notePayload)

        assert.deepEqual(result, { message: "note updated!" })
    })

    it("returns a service error when a note cannot be updated", async () => {
        replaceMethod(NotesQueries, "updateNote", async () => {
            throw new Error("note not found")
        })
        replaceMethod(console as unknown as MutableRecord, "error", () => undefined)

        const result = await NotesService.updateNote(userId, notePayload)

        assert.deepEqual(result, { error: "could not update note." })
    })

    it("deletes a note for a user", async () => {
        replaceMethod(NotesQueries, "deleteNote", async (receivedUserId: number, noteId: string) => {
            assert.equal(receivedUserId, userId)
            assert.equal(noteId, notePayload.id)
        })

        const result = await NotesService.deleteNote(userId, { id: notePayload.id })

        assert.deepEqual(result, { message: "note deleted!" })
    })

    it("returns a service error when a note cannot be deleted", async () => {
        replaceMethod(NotesQueries, "deleteNote", async () => {
            throw new Error("delete failed")
        })
        replaceMethod(console as unknown as MutableRecord, "error", () => undefined)

        const result = await NotesService.deleteNote(userId, { id: notePayload.id })

        assert.deepEqual(result, { error: "could not delete note." })
    })
})
