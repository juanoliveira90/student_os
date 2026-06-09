import { afterEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"

const { StudyPlanQueries } = await import("../../modules/studyPlan/studyPlan.queries.js")
const { StudyPlanService } = await import("../../modules/studyPlan/studyPlan.service.js")

type MutableRecord = Record<string, unknown>

const userId = 42
const subjectPayload = {
    id: randomUUID(),
    name: "Biology",
    tag: "science",
    schedule_block: null,
    subtasks: [
        {
            id: randomUUID(),
            name: "Read chapter 1",
            description: "Cells and organelles",
        },
    ],
}
const subtaskPayload = {
    subject_id: subjectPayload.id,
    subtasks: [
        {
            id: randomUUID(),
            name: "Practice questions",
            description: "End of chapter exercises",
        },
    ],
}
const subjectUpdatePayload = {
    id: subjectPayload.id,
    name: "Chemistry",
    tag: "science-updated",
    schedule_block: null,
}
const subtaskUpdatePayload = {
    id: subtaskPayload.subtasks[0]!.id,
    name: "Updated practice questions",
    description: null,
    done: true,
}
const plans = [
    {
        id: subjectPayload.id,
        name: subjectPayload.name,
        tag: subjectPayload.tag,
        schedule_block: subjectPayload.schedule_block,
        subtasks: [
            {
                id: subtaskPayload.subtasks[0]!.id,
                name: subtaskPayload.subtasks[0]!.name,
                description: subtaskPayload.subtasks[0]!.description,
                done: false,
            },
        ],
    },
]

const restoreFns: Array<() => void> = []

function replaceMethod(target: MutableRecord, method: string, replacement: unknown) {
    const original = target[method]
    target[method] = replacement

    const restore = () => {
        target[method] = original
    }

    restoreFns.push(restore)
    return restore
}

describe("study plan service", { concurrency: false }, () => {
    afterEach(() => {
        for (const restore of restoreFns.reverse()) restore()
        restoreFns.length = 0
    })

    it("loads study plans for a user", async () => {
        replaceMethod(StudyPlanQueries, "getStudyPlans", async (receivedUserId: number) => {
            assert.equal(receivedUserId, userId)
            return plans
        })

        const result = await StudyPlanService.getStudyPlans(userId)

        assert.deepEqual(result, { plans })
    })

    it("returns a service error when study plans cannot be loaded", async () => {
        replaceMethod(StudyPlanQueries, "getStudyPlans", async () => {
            throw new Error("select failed")
        })
        replaceMethod(console as unknown as MutableRecord, "error", () => undefined)

        const result = await StudyPlanService.getStudyPlans(userId)

        assert.deepEqual(result, { error: "could not load study plans" })
    })

    it("creates a subject with subtasks for a user", async () => {
        replaceMethod(StudyPlanQueries, "transactionSubjectSubtask", async (receivedUserId: number, data: typeof subjectPayload) => {
            assert.equal(receivedUserId, userId)
            assert.deepEqual(data, subjectPayload)
        })

        const result = await StudyPlanService.createSubject(userId, subjectPayload)

        assert.deepEqual(result, { message: "subject created!" })
    })

    it("returns a service error when a subject cannot be created", async () => {
        replaceMethod(StudyPlanQueries, "transactionSubjectSubtask", async () => {
            throw new Error("insert failed")
        })
        replaceMethod(console as unknown as MutableRecord, "error", () => undefined)

        const result = await StudyPlanService.createSubject(userId, subjectPayload)

        assert.deepEqual(result, { error: "an error occured when creating the subject." })
    })

    it("adds subtasks for a user subject", async () => {
        replaceMethod(StudyPlanQueries, "createSubtasks", async (receivedUserId: number, data: typeof subtaskPayload) => {
            assert.equal(receivedUserId, userId)
            assert.deepEqual(data, subtaskPayload)
        })

        const result = await StudyPlanService.addSubtask(userId, subtaskPayload)

        assert.deepEqual(result, { message: "subtask(s) created!" })
    })

    it("returns a service error when subtasks cannot be added", async () => {
        replaceMethod(StudyPlanQueries, "createSubtasks", async () => {
            throw new Error("subject not found")
        })
        replaceMethod(console as unknown as MutableRecord, "error", () => undefined)

        const result = await StudyPlanService.addSubtask(userId, subtaskPayload)

        assert.deepEqual(result, { error: "no subtasks created." })
    })

    it("updates a subject for a user", async () => {
        replaceMethod(StudyPlanQueries, "updateSubject", async (receivedUserId: number, data: typeof subjectUpdatePayload) => {
            assert.equal(receivedUserId, userId)
            assert.deepEqual(data, subjectUpdatePayload)
        })

        const result = await StudyPlanService.updateSubject(userId, subjectUpdatePayload)

        assert.deepEqual(result, { message: "subject updated!" })
    })

    it("returns a service error when a subject cannot be updated", async () => {
        replaceMethod(StudyPlanQueries, "updateSubject", async () => {
            throw new Error("subject not found")
        })
        replaceMethod(console as unknown as MutableRecord, "error", () => undefined)

        const result = await StudyPlanService.updateSubject(userId, subjectUpdatePayload)

        assert.deepEqual(result, { error: "could not update subject." })
    })

    it("updates a subtask for a user", async () => {
        replaceMethod(StudyPlanQueries, "updateSubtask", async (receivedUserId: number, data: typeof subtaskUpdatePayload) => {
            assert.equal(receivedUserId, userId)
            assert.deepEqual(data, subtaskUpdatePayload)
        })

        const result = await StudyPlanService.updateSubtask(userId, subtaskUpdatePayload)

        assert.deepEqual(result, { message: "subtask updated!" })
    })

    it("returns a service error when a subtask cannot be updated", async () => {
        replaceMethod(StudyPlanQueries, "updateSubtask", async () => {
            throw new Error("subtask not found")
        })
        replaceMethod(console as unknown as MutableRecord, "error", () => undefined)

        const result = await StudyPlanService.updateSubtask(userId, subtaskUpdatePayload)

        assert.deepEqual(result, { error: "could not update subtask." })
    })

    it("deletes a subtask for a user", async () => {
        replaceMethod(StudyPlanQueries, "deleteSubtask", async (receivedUserId: number, subtaskId: string) => {
            assert.equal(receivedUserId, userId)
            assert.equal(subtaskId, subtaskUpdatePayload.id)
        })

        const result = await StudyPlanService.deleteSubtask(userId, subtaskUpdatePayload.id)

        assert.deepEqual(result, { message: "subtask deleted!" })
    })

    it("returns a service error when a subtask cannot be deleted", async () => {
        replaceMethod(StudyPlanQueries, "deleteSubtask", async () => {
            throw new Error("delete failed")
        })
        replaceMethod(console as unknown as MutableRecord, "error", () => undefined)

        const result = await StudyPlanService.deleteSubtask(userId, subtaskUpdatePayload.id)

        assert.deepEqual(result, { error: "could not delete subtask." })
    })

    it("deletes a subject for a user", async () => {
        replaceMethod(StudyPlanQueries, "deleteSubject", async (receivedUserId: number, subjectId: string) => {
            assert.equal(receivedUserId, userId)
            assert.equal(subjectId, subjectPayload.id)
        })

        const result = await StudyPlanService.deleteSubject(userId, subjectPayload.id)

        assert.deepEqual(result, { message: "subject deleted!" })
    })

    it("returns a service error when a subject cannot be deleted", async () => {
        replaceMethod(StudyPlanQueries, "deleteSubject", async () => {
            throw new Error("delete failed")
        })
        replaceMethod(console as unknown as MutableRecord, "error", () => undefined)

        const result = await StudyPlanService.deleteSubject(userId, subjectPayload.id)

        assert.deepEqual(result, { error: "could not delete subject." })
    })
})
