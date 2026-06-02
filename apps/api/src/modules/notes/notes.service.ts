"use server"

import { NotesQueries } from "./notes.queries.ts"
import type { createNote, deleteNote, updateNote } from "./notes.type.ts"

export const NotesService = {
    async getNotes(userId: number) {
        try {
            const notes = await NotesQueries.getNotes(userId)
            return { notes }
        } catch (error) {
            console.error(error)
            return { error: "could not load notes" }
        }
    },

    async createNote(userId: number, data: createNote) {
        try {
            await NotesQueries.createNote(userId, data)
            return { message: "note created!" }
        } catch (error) {
            console.error(error)
            return { error: "could not create note." }
        }
    },

    async updateNote(userId: number, data: updateNote) {
        try {
            await NotesQueries.updateNote(userId, data)
            return { message: "note updated!" }
        } catch (error) {
            console.error(error)
            return { error: "could not update note." }
        }
    },

    async deleteNote(userId: number, data: deleteNote) {
        try {
            await NotesQueries.deleteNote(userId, data.id)
            return { message: "note deleted!" }
        } catch (error) {
            console.error(error)
            return { error: "could not delete note." }
        }
    }
}
