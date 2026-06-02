import type { FastifyInstance } from "fastify"
//import { DeleteSchema, InsertSchema } from "./studyPlan.schema.ts"
import { StudyPlanService } from "./studyPlan.service.ts"
import { deleteSubjectSchema, deleteSubtaskSchema, subjectInsertSchema, subjectUpdateSchema, subtaskInsertSchema, subtaskUpdateSchema } from "./studyPlan.schema.ts"

export async function StudyPlanController(app: FastifyInstance) {
    app.get('/', async (request, reply) => {
        const query = await StudyPlanService.getStudyPlans(parseInt(request.user.sub))
        if (query.error) {
            return reply.code(500).send(query.error)
        }

        return reply.code(200).send(query)
    })

    app.post('/subject', { schema: subjectInsertSchema }, async (request, reply) => {
        const data = request.body as Parameters<typeof StudyPlanService.createSubject>[1]
        const query = await StudyPlanService.createSubject(parseInt(request.user.sub), data)
        if (query.error) {
            return reply.code(500).send(query)
        }

        return reply.code(201).send(query)
    })

    app.post('/subtask', { schema: subtaskInsertSchema }, async (request, reply) => {
        const data = request.body as Parameters<typeof StudyPlanService.addSubtask>[1]
        const query = await StudyPlanService.addSubtask(parseInt(request.user.sub), data)
        if (query.error) {
            return reply.code(500).send(query)
        }

        return reply.code(201).send(query)
    })

    app.delete('/subtask', { schema: deleteSubtaskSchema }, async (request, reply) => {
        const { id } = request.body as { id: string }
        const query = await StudyPlanService.deleteSubtask(parseInt(request.user.sub), id)
        if (query.error) {
            return reply.code(500).send(query.error)
        }

        return reply.code(200).send(query)
    })

    app.delete('/subject', { schema: deleteSubjectSchema }, async (request, reply) => {
        const { id } = request.body as { id: string }
        const query = await StudyPlanService.deleteSubject(parseInt(request.user.sub), id)
        if (query.error) {
            return reply.code(500).send(query.error)
        }

        return reply.code(200).send(query)
    })

    app.put('/subject', { schema: subjectUpdateSchema }, async (request, reply) => {
        const data = request.body as Parameters<typeof StudyPlanService.updateSubject>[1]
        const query = await StudyPlanService.updateSubject(parseInt(request.user.sub), data)
        if (query.error) {
            return reply.code(500).send(query)
        }

        return reply.code(200).send(query)
    })

    app.put('/subtask', { schema: subtaskUpdateSchema }, async (request, reply) => {
        const data = request.body as Parameters<typeof StudyPlanService.updateSubtask>[1]
        const query = await StudyPlanService.updateSubtask(parseInt(request.user.sub), data)
        if (query.error) {
            return reply.code(500).send(query)
        }

        return reply.code(200).send(query)
    })
}
