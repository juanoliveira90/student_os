import { afterEach, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"

process.env.JWT_SECRET ??= randomUUID()
process.env.COOKIE_SECRET ??= randomUUID()
process.env.NODE_ENV = "test"

const { default: Build } = await import("../../app.js")
const { db } = await import("../../db/client.js")
const { Users } = await import("../../db/schema.js")

type SubjectPayload = {
    id: string
    study_plan_id?: string
    name: string
    description?: string | null
    tag?: string | null
    schedule_block?: string | null
    subtasks?: Array<{
        id: string
        name: string
        description?: string
    }>
}

type StudyPlanPayload = {
    id: string
    name: string
    day_of_week?: string | null
    start_time?: string | null
    start_period?: string | null
    end_time?: string | null
    end_period?: string | null
    schedule_block?: string | null
}

type ScheduleEvent = {
    id: string
    day_of_week: string
    title: string
    tag?: string
    description?: string | null
    start_time: string
    start_period: string
    end_time: string
    end_period: string
}

type SubtaskPayload = {
    id: string
    name: string
    description?: string | null
    done?: boolean
}

function makeUser() {
    const id = randomUUID()

    return {
        name: `Study Plan Student ${id}`,
        email: `study.plan.student.${id}@example.com`,
    }
}

function makeSubject(overrides: Partial<SubjectPayload> = {}) {
    return {
        id: randomUUID(),
        name: "Biology",
        description: "Cell structure and genetics fundamentals",
        tag: "science",
        schedule_block: null,
        subtasks: [
            {
                id: randomUUID(),
                name: "Read chapter 1",
                description: "Cells and organelles",
            },
        ],
        ...overrides,
    }
}

function makeStudyPlan(overrides: Partial<StudyPlanPayload> = {}) {
    return {
        id: randomUUID(),
        name: "Final Exams Preparation",
        day_of_week: "Monday",
        start_time: "09:00",
        start_period: "AM",
        end_time: "10:00",
        end_period: "AM",
        schedule_block: null,
        ...overrides,
    }
}

function makeScheduleEvent(overrides: Partial<ScheduleEvent> = {}) {
    return {
        id: randomUUID(),
        day_of_week: "Wednesday",
        title: "Existing calculus block",
        tag: "calculus",
        description: "Already on the weekly schedule",
        start_time: "13:00",
        start_period: "PM",
        end_time: "14:00",
        end_period: "PM",
        ...overrides,
    }
}

function makeSubtask(overrides: Partial<SubtaskPayload> = {}) {
    return {
        id: randomUUID(),
        name: "Practice questions",
        description: "End of chapter exercises",
        ...overrides,
    }
}

async function createUser(user: ReturnType<typeof makeUser>) {
    const insertedUsers = await db.insert(Users).values({
        name: user.name,
        email: user.email,
        email_verified: true,
    }).returning({ id: Users.id })

    const insertedUser = insertedUsers[0]
    assert.ok(insertedUser, "expected test user to be inserted")

    return insertedUser
}

async function deleteUserByEmail(email: string) {
    await db.delete(Users).where(eq(Users.email, email))
}

function authCookie(app: ReturnType<typeof Build>, userId: number, email: string) {
    return `access_token=${app.jwt.sign({ sub: userId.toString(), email })}`
}

function invalidSubjectCookie(app: ReturnType<typeof Build>, email: string) {
    return `access_token=${app.jwt.sign({ sub: "not-a-number", email })}`
}

function assertSubject(actual: Record<string, unknown>, expected: SubjectPayload) {
    assert.equal(actual.id, expected.id)
    if (expected.study_plan_id !== undefined) {
        assert.equal(actual.study_plan_id, expected.study_plan_id)
    }
    assert.equal(actual.name, expected.name)
    assert.equal(actual.description, expected.description)
    assert.equal(actual.tag, expected.tag)
    assert.equal(actual.schedule_block, expected.schedule_block)
}

function assertStudyPlan(actual: Record<string, unknown>, expected: StudyPlanPayload) {
    assert.equal(actual.id, expected.id)
    assert.equal(actual.name, expected.name)
    assert.equal(actual.day_of_week, expected.day_of_week)
    assert.match(String(actual.start_time), new RegExp(`^${expected.start_time}`))
    assert.equal(actual.start_period, expected.start_period)
    assert.match(String(actual.end_time), new RegExp(`^${expected.end_time}`))
    assert.equal(actual.end_period, expected.end_period)
    assert.equal(actual.schedule_block, expected.schedule_block)
}

function assertSubtask(actual: Record<string, unknown>, expected: SubtaskPayload) {
    assert.equal(actual.id, expected.id)
    assert.equal(actual.name, expected.name)
    assert.equal(actual.description, expected.description)
    if (expected.done !== undefined) {
        assert.equal(actual.done, expected.done)
    }
}

async function withExpectedErrorLogSilenced<T>(callback: () => Promise<T>) {
    const originalConsoleError = console.error
    console.error = () => undefined

    try {
        return await callback()
    } finally {
        console.error = originalConsoleError
    }
}

describe("study plan controller", { concurrency: false }, () => {
    let app: ReturnType<typeof Build>
    let user: ReturnType<typeof makeUser>
    let cookie: string

    beforeEach(async () => {
        app = Build()
        await app.ready()

        user = makeUser()
        const dbUser = await createUser(user)
        cookie = authCookie(app, dbUser.id, user.email)
    })

    afterEach(async () => {
        await deleteUserByEmail(user.email)
        await app.close()
    })

    it("starts with an empty study plan list for a user without subjects", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/plan",
            headers: { cookie },
        })

        assert.equal(response.statusCode, 200)
        assert.deepEqual(response.json(), { plans: [] })
    })

    it("creates a parent study plan with a scheduled time and nests subjects under it", async () => {
        const studyPlan = makeStudyPlan()
        const subject = makeSubject({ study_plan_id: studyPlan.id })
        const firstSubtask = subject.subtasks![0]!

        const createStudyPlanResponse = await app.inject({
            method: "POST",
            url: "/plan",
            headers: { cookie },
            payload: studyPlan,
        })

        assert.equal(createStudyPlanResponse.statusCode, 201)
        assert.deepEqual(createStudyPlanResponse.json(), { message: "study plan created!" })

        const createSubjectResponse = await app.inject({
            method: "POST",
            url: "/plan/subject",
            headers: { cookie },
            payload: subject,
        })

        assert.equal(createSubjectResponse.statusCode, 201)

        const plansResponse = await app.inject({
            method: "GET",
            url: "/plan",
            headers: { cookie },
        })

        assert.equal(plansResponse.statusCode, 200)
        const plans = plansResponse.json().plans
        assert.equal(plans.length, 1)
        assertStudyPlan(plans[0], studyPlan)
        assert.equal(plans[0].subjects.length, 1)
        assertSubject(plans[0].subjects[0], subject)
        assert.equal(plans[0].subjects[0].subtasks.length, 1)
        assertSubtask(plans[0].subjects[0].subtasks[0], { ...firstSubtask, done: false })

        const scheduleResponse = await app.inject({
            method: "GET",
            url: "/schedule",
            headers: { cookie },
        })

        assert.equal(scheduleResponse.statusCode, 200)
        const events = scheduleResponse.json().events
        assert.equal(events.length, 1)
        assert.equal(events[0].study_plan_id, studyPlan.id)
        assert.equal(events[0].title, studyPlan.name)
        assert.equal(events[0].day_of_week, studyPlan.day_of_week)
        assert.match(String(events[0].start_time), /^09:00/)
        assert.match(String(events[0].end_time), /^10:00/)
    })

    it("assigns an existing schedule block to a parent study plan", async () => {
        const event = makeScheduleEvent()
        const studyPlan = makeStudyPlan({
            day_of_week: null,
            start_time: null,
            start_period: null,
            end_time: null,
            end_period: null,
            schedule_block: event.id,
        })

        const createEventResponse = await app.inject({
            method: "PUT",
            url: "/schedule",
            headers: { cookie },
            payload: { events: [event] },
        })

        assert.equal(createEventResponse.statusCode, 201)

        const createStudyPlanResponse = await app.inject({
            method: "POST",
            url: "/plan",
            headers: { cookie },
            payload: studyPlan,
        })

        assert.equal(createStudyPlanResponse.statusCode, 201)
        assert.deepEqual(createStudyPlanResponse.json(), { message: "study plan created!" })

        const scheduleResponse = await app.inject({
            method: "GET",
            url: "/schedule",
            headers: { cookie },
        })

        assert.equal(scheduleResponse.statusCode, 200)
        const events = scheduleResponse.json().events
        assert.equal(events.length, 1)
        assert.equal(events[0].id, event.id)
        assert.equal(events[0].study_plan_id, studyPlan.id)
        assert.equal(events[0].title, event.title)
    })

    it("updates and deletes a parent study plan schedule assignment", async () => {
        const initialBlock = makeScheduleEvent({ day_of_week: "Monday" })
        const updatedBlock = makeScheduleEvent({ day_of_week: "Thursday" })
        const studyPlan = makeStudyPlan({ schedule_block: initialBlock.id })

        const createEventsResponse = await app.inject({
            method: "PUT",
            url: "/schedule",
            headers: { cookie },
            payload: { events: [initialBlock, updatedBlock] },
        })

        assert.equal(createEventsResponse.statusCode, 201)

        const createStudyPlanResponse = await app.inject({
            method: "POST",
            url: "/plan",
            headers: { cookie },
            payload: studyPlan,
        })

        assert.equal(createStudyPlanResponse.statusCode, 201)

        const updateStudyPlanResponse = await app.inject({
            method: "PUT",
            url: "/plan",
            headers: { cookie },
            payload: {
                ...studyPlan,
                name: "Final Exams Updated",
                schedule_block: updatedBlock.id,
            },
        })

        assert.equal(updateStudyPlanResponse.statusCode, 200)
        assert.deepEqual(updateStudyPlanResponse.json(), { message: "study plan updated!" })

        const updatedScheduleResponse = await app.inject({
            method: "GET",
            url: "/schedule",
            headers: { cookie },
        })

        assert.equal(updatedScheduleResponse.statusCode, 200)
        const updatedEvents = updatedScheduleResponse.json().events
        assert.equal(updatedEvents.find((event: Record<string, unknown>) => event.id === initialBlock.id).study_plan_id, null)
        assert.equal(updatedEvents.find((event: Record<string, unknown>) => event.id === updatedBlock.id).study_plan_id, studyPlan.id)

        const deleteStudyPlanResponse = await app.inject({
            method: "DELETE",
            url: "/plan",
            headers: { cookie },
            payload: { id: studyPlan.id },
        })

        assert.equal(deleteStudyPlanResponse.statusCode, 200)
        assert.deepEqual(deleteStudyPlanResponse.json(), { message: "study plan deleted!" })

        const emptyPlansResponse = await app.inject({
            method: "GET",
            url: "/plan",
            headers: { cookie },
        })

        assert.equal(emptyPlansResponse.statusCode, 200)
        assert.deepEqual(emptyPlansResponse.json(), { plans: [] })
    })

    it("creates, reads, updates, and deletes subjects and subtasks through HTTP endpoints", async () => {
        const subject = makeSubject()
        const firstSubtask = subject.subtasks![0]!

        const createSubjectResponse = await app.inject({
            method: "POST",
            url: "/plan/subject",
            headers: { cookie },
            payload: subject,
        })

        assert.equal(createSubjectResponse.statusCode, 201)
        assert.deepEqual(createSubjectResponse.json(), { message: "subject created!" })

        const createdPlansResponse = await app.inject({
            method: "GET",
            url: "/plan",
            headers: { cookie },
        })

        assert.equal(createdPlansResponse.statusCode, 200)
        const createdPlans = createdPlansResponse.json().plans
        assert.equal(createdPlans.length, 1)
        assertSubject(createdPlans[0], subject)
        assert.equal(createdPlans[0].subtasks.length, 1)
        assertSubtask(createdPlans[0].subtasks[0], { ...firstSubtask, done: false })

        const extraSubtask = makeSubtask()
        const createSubtaskResponse = await app.inject({
            method: "POST",
            url: "/plan/subtask",
            headers: { cookie },
            payload: {
                subject_id: subject.id,
                subtasks: [extraSubtask],
            },
        })

        assert.equal(createSubtaskResponse.statusCode, 201)
        assert.deepEqual(createSubtaskResponse.json(), { message: "subtask(s) created!" })

        const updatedSubject = {
            id: subject.id,
            name: "Chemistry",
            description: "Atoms, bonding, and reactions",
            tag: "science-updated",
            schedule_block: null,
        }
        const updateSubjectResponse = await app.inject({
            method: "PUT",
            url: "/plan/subject",
            headers: { cookie },
            payload: updatedSubject,
        })

        assert.equal(updateSubjectResponse.statusCode, 200)
        assert.deepEqual(updateSubjectResponse.json(), { message: "subject updated!" })

        const updatedSubtask = {
            id: extraSubtask.id,
            name: "Practice updated questions",
            description: null,
            done: true,
        }
        const updateSubtaskResponse = await app.inject({
            method: "PUT",
            url: "/plan/subtask",
            headers: { cookie },
            payload: updatedSubtask,
        })

        assert.equal(updateSubtaskResponse.statusCode, 200)
        assert.deepEqual(updateSubtaskResponse.json(), { message: "subtask updated!" })

        const updatedPlansResponse = await app.inject({
            method: "GET",
            url: "/plan",
            headers: { cookie },
        })

        assert.equal(updatedPlansResponse.statusCode, 200)
        const updatedPlans = updatedPlansResponse.json().plans
        assert.equal(updatedPlans.length, 1)
        assertSubject(updatedPlans[0], updatedSubject)
        assert.equal(updatedPlans[0].subtasks.length, 2)
        assert.ok(
            updatedPlans[0].subtasks.some((subtask: Record<string, unknown>) => subtask.id === firstSubtask.id),
        )
        const persistedUpdatedSubtask = updatedPlans[0].subtasks.find(
            (subtask: Record<string, unknown>) => subtask.id === updatedSubtask.id,
        )
        assert.ok(persistedUpdatedSubtask, "expected updated subtask to exist")
        assertSubtask(persistedUpdatedSubtask, updatedSubtask)

        const deleteSubtaskResponse = await app.inject({
            method: "DELETE",
            url: "/plan/subtask",
            headers: { cookie },
            payload: { id: firstSubtask.id },
        })

        assert.equal(deleteSubtaskResponse.statusCode, 200)
        assert.deepEqual(deleteSubtaskResponse.json(), { message: "subtask deleted!" })

        const deleteSubjectResponse = await app.inject({
            method: "DELETE",
            url: "/plan/subject",
            headers: { cookie },
            payload: { id: subject.id },
        })

        assert.equal(deleteSubjectResponse.statusCode, 200)
        assert.deepEqual(deleteSubjectResponse.json(), { message: "subject deleted!" })

        const emptyPlansResponse = await app.inject({
            method: "GET",
            url: "/plan",
            headers: { cookie },
        })

        assert.equal(emptyPlansResponse.statusCode, 200)
        assert.deepEqual(emptyPlansResponse.json(), { plans: [] })
    })

    it("does not expose another user's study plan subjects", async () => {
        const otherUser = makeUser()
        const otherDbUser = await createUser(otherUser)
        const otherCookie = authCookie(app, otherDbUser.id, otherUser.email)

        try {
            const response = await app.inject({
                method: "POST",
                url: "/plan/subject",
                headers: { cookie: otherCookie },
                payload: makeSubject({ name: "Private subject" }),
            })

            assert.equal(response.statusCode, 201)

            const plansResponse = await app.inject({
                method: "GET",
                url: "/plan",
                headers: { cookie },
            })

            assert.equal(plansResponse.statusCode, 200)
            assert.deepEqual(plansResponse.json(), { plans: [] })
        } finally {
            await deleteUserByEmail(otherUser.email)
        }
    })

    it("rejects study plan requests without authentication", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/plan",
        })

        assert.equal(response.statusCode, 401)
        assert.deepEqual(response.json(), { message: "not authenticated" })
    })

    it("rejects invalid subject payloads", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/plan/subject",
            headers: { cookie },
            payload: { name: "Missing id" },
        })

        assert.equal(response.statusCode, 400)
    })

    it("returns 500 when study plans loading fails", async () => {
        const response = await withExpectedErrorLogSilenced(async () => {
            return await app.inject({
                method: "GET",
                url: "/plan",
                headers: { cookie: invalidSubjectCookie(app, user.email) },
            })
        })

        assert.equal(response.statusCode, 500)
        assert.equal(response.body, "could not load study plans")
    })

    it("returns 500 when subject creation fails", async () => {
        const response = await withExpectedErrorLogSilenced(async () => {
            return await app.inject({
                method: "POST",
                url: "/plan/subject",
                headers: { cookie: invalidSubjectCookie(app, user.email) },
                payload: makeSubject(),
            })
        })

        assert.equal(response.statusCode, 500)
        assert.deepEqual(response.json(), { error: "an error occured when creating the subject." })
    })

    it("returns 500 when subtask creation fails", async () => {
        const response = await withExpectedErrorLogSilenced(async () => {
            return await app.inject({
                method: "POST",
                url: "/plan/subtask",
                headers: { cookie },
                payload: {
                    subject_id: randomUUID(),
                    subtasks: [makeSubtask()],
                },
            })
        })

        assert.equal(response.statusCode, 500)
        assert.deepEqual(response.json(), { error: "no subtasks created." })
    })

    it("returns 500 when subject update fails", async () => {
        const response = await withExpectedErrorLogSilenced(async () => {
            return await app.inject({
                method: "PUT",
                url: "/plan/subject",
                headers: { cookie },
                payload: {
                    id: randomUUID(),
                    name: "Missing subject",
                    description: null,
                    tag: null,
                    schedule_block: null,
                },
            })
        })

        assert.equal(response.statusCode, 500)
        assert.deepEqual(response.json(), { error: "could not update subject." })
    })

    it("returns 500 when subtask update fails", async () => {
        const response = await withExpectedErrorLogSilenced(async () => {
            return await app.inject({
                method: "PUT",
                url: "/plan/subtask",
                headers: { cookie },
                payload: {
                    id: randomUUID(),
                    name: "Missing subtask",
                    description: null,
                    done: true,
                },
            })
        })

        assert.equal(response.statusCode, 500)
        assert.deepEqual(response.json(), { error: "could not update subtask." })
    })

    it("returns 500 when subtask delete fails", async () => {
        const response = await withExpectedErrorLogSilenced(async () => {
            return await app.inject({
                method: "DELETE",
                url: "/plan/subtask",
                headers: { cookie: invalidSubjectCookie(app, user.email) },
                payload: { id: randomUUID() },
            })
        })

        assert.equal(response.statusCode, 500)
        assert.equal(response.body, "could not delete subtask.")
    })

    it("returns 500 when subject delete fails", async () => {
        const response = await withExpectedErrorLogSilenced(async () => {
            return await app.inject({
                method: "DELETE",
                url: "/plan/subject",
                headers: { cookie: invalidSubjectCookie(app, user.email) },
                payload: { id: randomUUID() },
            })
        })

        assert.equal(response.statusCode, 500)
        assert.equal(response.body, "could not delete subject.")
    })
})
