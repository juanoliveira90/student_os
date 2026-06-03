import type { FastifyInstance } from "fastify"
import { DeleteSchema, InsertSchema } from "./schedule.schema.js"
import { ScheduleService } from "./schedule.service.js"

export async function ScheduleController(app: FastifyInstance) {
    app.get('/', async (request, reply) => {
        const query = await ScheduleService.getSchedule(parseInt(request.user.sub))
        if (query.error) {
            return reply.code(500).send(query.error)
        }

        return reply.code(200).send(query)
    })

    app.put('/', { schema: InsertSchema }, async (request, reply) => {
        const data = request.body as Parameters<typeof ScheduleService.updateSchedule>[1]
        const query = await ScheduleService.updateSchedule(parseInt(request.user.sub), data)
        if (query.error) {
            return reply.code(500).send(query.error)
        }

        return reply.code(201).send(query.message)
    })

    app.delete('/delete', { schema: DeleteSchema }, async (request, reply) => {
        const data = request.body as Parameters<typeof ScheduleService.deleteEvent>[1]
        const query = await ScheduleService.deleteEvent(parseInt(request.user.sub), data)
        if (query.error) {
            return reply.code(500).send(query.error)
        }

        return reply.code(200).send(query.message)
    })
}
