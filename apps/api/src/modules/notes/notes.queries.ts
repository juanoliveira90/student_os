import { db } from "../../db/client.ts"
import { Notes } from "../../db/schema.ts"
import { and, eq } from "drizzle-orm"
import type { createNote, updateNote } from "./notes.type.ts"

export const NotesQueries = {
    async getNotes(userId: number) {
        return await db.select().from(Notes)
        .where(eq(Notes.user_id, userId))
    },

    async createNote(userId: number, data: createNote) {
        await db.insert(Notes).values({
            id: data.id,
            user_id: userId,
            title: data.title,
            content: data.content
        })
    },

    async updateNote(userId: number, data: updateNote) {
        await this.findUserNote(userId, data.id)

        await db.update(Notes)
        .set({
            title: data.title,
            content: data.content,
            updated_at: new Date()
        })
        .where(and(eq(Notes.id, data.id), eq(Notes.user_id, userId)))
    },

    async deleteNote(userId: number, noteId: string) {
        await db.delete(Notes)
        .where(and(eq(Notes.id, noteId), eq(Notes.user_id, userId)))
    },

    async findUserNote(userId: number, noteId: string) {
        const note = await db.select({ id: Notes.id })
        .from(Notes)
        .where(and(eq(Notes.id, noteId), eq(Notes.user_id, userId)))

        if (!note[0]) {
            throw new Error("note not found")
        }
    }
}
