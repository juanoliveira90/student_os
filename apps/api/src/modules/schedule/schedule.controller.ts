import type { FastifyInstance } from "fastify"
import { InsertSchema } from "./schedule.schema.ts"
import { ScheduleService } from "./schedule.service.ts"

export async function ScheduleController(app: FastifyInstance) {
    app.put('/add', { schema: InsertSchema }, async (request, reply) => {
        console.log(request.body)
        await ScheduleService.addEvent(parseInt(request.user.sub), request.body as any)

        return reply.code(201).send({ message: "event added!" })
    })
}