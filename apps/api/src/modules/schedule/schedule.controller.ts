import type { FastifyInstance } from "fastify"
import { InsertSchema, DeleteSchema } from "./schedule.schema.ts"
import { ScheduleService } from "./schedule.service.ts"

export async function ScheduleController(app: FastifyInstance) {
    app.put('/', { schema: InsertSchema }, async (request, reply) => {
        const query = await ScheduleService.updateSchedule(parseInt(request.user.sub), request.body as any)
        if (query.error) {
            return reply.code(500).send(query.error)
        }
        
        return reply.code(201).send(query.message)
    })

    app.delete('/delete', { schema: DeleteSchema }, async (request, reply) => {
        const query = await ScheduleService.deleteEvent(parseInt(request.user.sub), request.body as any)
        if (query.error) {
            return reply.code(500).send(query.error)
        }

        return reply.code(200).send(query.message)
    })
}
