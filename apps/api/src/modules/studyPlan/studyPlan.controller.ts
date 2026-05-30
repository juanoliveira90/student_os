import type { FastifyInstance } from "fastify"
//import { DeleteSchema, InsertSchema } from "./studyPlan.schema.ts"
import { StudyPlanService } from "./studyPlan.service.ts"
import { subjectInsertSchema } from "./studyPlan.schema.ts"

export async function StudyPlanController(app: FastifyInstance) {
    app.get('/', async (request, reply) => {
        const query = await StudyPlanService.getStudyPlans(parseInt(request.user.sub))
        if (query.error) {
            return reply.code(500).send(query.error)
        }

        return reply.code(200).send(query)
    })

    app.post('/subject', { schema: subjectInsertSchema }, async (request, reply) => {
        const query = await StudyPlanService.createSubject(request.body as any)
        if (query.error) {
            return reply.code(500).send(query)
        }

        return reply.code(201).send(query)
    })
}
