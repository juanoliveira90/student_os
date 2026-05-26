import type { FastifyInstance } from "fastify"
import { InsertSchema, updateSchema } from "./schedule.schema.ts"
import { ScheduleService } from "./schedule.service.ts"

export async function ScheduleController(app: FastifyInstance) {
    app.put('/', { schema: InsertSchema }, async (request, reply) => {
        const query = await ScheduleService.updateSchedule(parseInt(request.user.sub), request.body as any)

        return reply.code(201).send(query.message)
    })
}