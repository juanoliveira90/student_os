import type { FastifyInstance } from "fastify"
//import { DeleteSchema, InsertSchema } from "./studyPlan.schema.js"
import { StudyPlanService } from "./studyPlan.service.js"
import { deleteStudyPlanSchema, deleteSubjectSchema, deleteSubtaskSchema, studyPlanInsertSchema, subjectInsertSchema, subjectUpdateSchema, subtaskInsertSchema, subtaskUpdateSchema } from "./studyPlan.schema.js"

export async function StudyPlanController(app: FastifyInstance) {
    app.get('/', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request, reply) => {
        const query = await StudyPlanService.getStudyPlans(parseInt(request.user.sub))
        if (query.error) {
            return reply.code(500).send(query.error)
        }

        return reply.code(200).send(query)
    })

    app.post('/', { schema: studyPlanInsertSchema, config: { rateLimit: { max: 20, timeWindow: '1 minute' } }}, async (request, reply) => {
        const data = request.body as Parameters<typeof StudyPlanService.createStudyPlan>[1]
        const query = await StudyPlanService.createStudyPlan(parseInt(request.user.sub), data)
        if (query.error) {
            return reply.code(500).send(query)
        }

        return reply.code(201).send(query)
    })

    app.put('/', { schema: studyPlanInsertSchema, config: { rateLimit: { max: 30, timeWindow: '1 minute', keyGenerator: (request) => request.user.sub } } }, async (request, reply) => {
        const data = request.body as Parameters<typeof StudyPlanService.updateStudyPlan>[1]
        const query = await StudyPlanService.updateStudyPlan(parseInt(request.user.sub), data)
        if (query.error) {
            return reply.code(500).send(query)
        }

        return reply.code(200).send(query)
    })

    app.delete('/', { schema: deleteStudyPlanSchema, config: { rateLimit: { max: 15, timeWindow: '1 minute', keyGenerator: (request) => request.user.sub } } }, async (request, reply) => {
        const { id } = request.body as { id: string }
        const query = await StudyPlanService.deleteStudyPlan(parseInt(request.user.sub), id)
        if (query.error) {
            return reply.code(500).send(query.error)
        }

        return reply.code(200).send(query)
    })

    app.post('/subject', { schema: subjectInsertSchema, config: { rateLimit: { max: 20, timeWindow: '1 minute' } }}, async (request, reply) => {
        const data = request.body as Parameters<typeof StudyPlanService.createSubject>[1]
        const query = await StudyPlanService.createSubject(parseInt(request.user.sub), data)
        if (query.error) {
            return reply.code(500).send(query)
        }

        return reply.code(201).send(query)
    })

    app.post('/subtask', { schema: subtaskInsertSchema, config: { rateLimit: { max: 20, timeWindow: '1 minute' } }}, async (request, reply) => {
        const data = request.body as Parameters<typeof StudyPlanService.addSubtask>[1]
        const query = await StudyPlanService.addSubtask(parseInt(request.user.sub), data)
        if (query.error) {
            return reply.code(500).send(query)
        }

        return reply.code(201).send(query)
    })

    app.delete('/subtask', { schema: deleteSubtaskSchema, config: { rateLimit: { max: 15, timeWindow: '1 minute' } } }, async (request, reply) => {
        const { id } = request.body as { id: string }
        const query = await StudyPlanService.deleteSubtask(parseInt(request.user.sub), id)
        if (query.error) {
            return reply.code(500).send(query.error)
        }

        return reply.code(200).send(query)
    })

    app.delete('/subject', { schema: deleteSubjectSchema, config: { rateLimit: { max: 15, timeWindow: '1 minute', keyGenerator: (request) => request.user.sub } } }, async (request, reply) => {
        const { id } = request.body as { id: string }
        const query = await StudyPlanService.deleteSubject(parseInt(request.user.sub), id)
        if (query.error) {
            return reply.code(500).send(query.error)
        }

        return reply.code(200).send(query)
    })

    app.put('/subject', { schema: subjectUpdateSchema, config: { rateLimit: { max: 30, timeWindow: '1 minute', keyGenerator: (request) => request.user.sub } } }, async (request, reply) => {
        const data = request.body as Parameters<typeof StudyPlanService.updateSubject>[1]
        const query = await StudyPlanService.updateSubject(parseInt(request.user.sub), data)
        if (query.error) {
            return reply.code(500).send(query)
        }

        return reply.code(200).send(query)
    })

    app.put('/subtask', { schema: subtaskUpdateSchema, config: { rateLimit: { max: 30, timeWindow: '1 minute', keyGenerator: (request) => request.user.sub } } }, async (request, reply) => {
        const data = request.body as Parameters<typeof StudyPlanService.updateSubtask>[1]
        const query = await StudyPlanService.updateSubtask(parseInt(request.user.sub), data)
        if (query.error) {
            return reply.code(500).send(query)
        }

        return reply.code(200).send(query)
    })
}
