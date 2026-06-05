import type { FastifyInstance } from "fastify"
import { noteDeleteSchema, noteInsertSchema, noteUpdateSchema } from "./notes.schema.js"
import { NotesService } from "./notes.service.js"

export async function NotesController(app: FastifyInstance) {
    app.get('/', { config: { rateLimit: { max: 60, timeWindow: '1 minute', keyGenerator: (request) => request.user.sub } } }, async (request, reply) => {
        const query = await NotesService.getNotes(parseInt(request.user.sub))
        if (query.error) {
            return reply.code(500).send(query.error)
        }

        return reply.code(200).send(query)
    })

    app.post('/', { schema: noteInsertSchema, config: { rateLimit: { max: 20, timeWindow: '1 minute', keyGenerator: (request) => request.user.sub } } }, async (request, reply) => {
        const data = request.body as Parameters<typeof NotesService.createNote>[1]
        const query = await NotesService.createNote(parseInt(request.user.sub), data)
        if (query.error) {
            return reply.code(500).send(query)
        }

        return reply.code(201).send(query)
    })

    app.put('/', { schema: noteUpdateSchema, config: { rateLimit: { max: 30, timeWindow: '1 minute', keyGenerator: (request) => request.user.sub } } }, async (request, reply) => {
        const data = request.body as Parameters<typeof NotesService.updateNote>[1]
        const query = await NotesService.updateNote(parseInt(request.user.sub), data)
        if (query.error) {
            return reply.code(500).send(query)
        }

        return reply.code(200).send(query)
    })

    app.delete('/', { schema: noteDeleteSchema, config: { rateLimit: { max: 15, timeWindow: '1 minute', keyGenerator: (request) => request.user.sub } } }, async (request, reply) => {
        const data = request.body as Parameters<typeof NotesService.deleteNote>[1]
        const query = await NotesService.deleteNote(parseInt(request.user.sub), data)
        if (query.error) {
            return reply.code(500).send(query.error)
        }

        return reply.code(200).send(query)
    })
}
