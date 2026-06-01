import type { FastifyInstance } from "fastify"
import { noteDeleteSchema, noteInsertSchema, noteUpdateSchema } from "./notes.schema.ts"
import { NotesService } from "./notes.service.ts"

export async function NotesController(app: FastifyInstance) {
    app.get('/', async (request, reply) => {
        const query = await NotesService.getNotes(parseInt(request.user.sub))
        if (query.error) {
            return reply.code(500).send(query.error)
        }

        return reply.code(200).send(query)
    })

    app.post('/', { schema: noteInsertSchema }, async (request, reply) => {
        const query = await NotesService.createNote(parseInt(request.user.sub), request.body as any)
        if (query.error) {
            return reply.code(500).send(query)
        }

        return reply.code(201).send(query)
    })

    app.put('/', { schema: noteUpdateSchema }, async (request, reply) => {
        const query = await NotesService.updateNote(parseInt(request.user.sub), request.body as any)
        if (query.error) {
            return reply.code(500).send(query)
        }

        return reply.code(200).send(query)
    })

    app.delete('/', { schema: noteDeleteSchema }, async (request, reply) => {
        const query = await NotesService.deleteNote(parseInt(request.user.sub), request.body as any)
        if (query.error) {
            return reply.code(500).send(query.error)
        }

        return reply.code(200).send(query)
    })
}
