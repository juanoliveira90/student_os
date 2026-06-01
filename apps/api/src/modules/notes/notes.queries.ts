import { db } from "../../db/client.ts"
import { Notes, Subjects } from "../../db/schema.ts"
import { and, eq } from "drizzle-orm"
import type { createNote, updateNote } from "./notes.type.ts"

export const NotesQueries = {
    async getNotes(userId: number) {
        return await db.select().from(Notes)
        .where(eq(Notes.user_id, userId))
    },

    async createNote(userId: number, data: createNote) {
        if (data.subject_id) {
            await this.findUserSubject(userId, data.subject_id)
        }

        await db.insert(Notes).values({
            id: data.id,
            user_id: userId,
            subject_id: data.subject_id || null,
            title: data.title,
            content: data.content
        })
    },

    async updateNote(userId: number, data: updateNote) {
        await this.findUserNote(userId, data.id)

        if (data.subject_id) {
            await this.findUserSubject(userId, data.subject_id)
        }

        await db.update(Notes)
        .set({
            title: data.title,
            content: data.content,
            subject_id: data.subject_id || null,
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
    },

    async findUserSubject(userId: number, subjectId: string) {
        const subject = await db.select({ id: Subjects.id })
        .from(Subjects)
        .where(and(eq(Subjects.id, subjectId), eq(Subjects.user_id, userId)))

        if (!subject[0]) {
            throw new Error("subject not found")
        }
    }
}
