import { afterEach, describe, it } from "node:test"
import assert from "node:assert/strict"

const { ScheduleQueries } = await import("../../modules/schedule/schedule.queries.js")
const { ScheduleService } = await import("../../modules/schedule/schedule.service.js")

type MutableRecord = Record<string, unknown>

const userId = 42
const scheduleId = 7
const eventPayload = {
    events: [
        {
            id: "event-1",
            day_of_week: "Monday",
            title: "Study biology",
            tag: "biology",
            description: "Cell structure review",
            start_time: "09:00",
            start_period: "AM",
            end_time: "10:00",
            end_period: "AM",
        },
    ],
}
const twentyFourHourEventPayload = {
    events: [
        {
            id: "event-2",
            day_of_week: "Tuesday",
            title: "Study chemistry",
            tag: "chemistry",
            description: null,
            start_time: "14:00",
            end_time: "15:30",
        },
    ],
}

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

describe("schedule service", { concurrency: false }, () => {
    afterEach(() => {
        for (const restore of restoreFns.reverse()) restore()
        restoreFns.length = 0
    })

    it("returns an empty event list when the user has no schedule", async () => {
        replaceMethod(ScheduleQueries, "getScheduleId", async (receivedUserId: number) => {
            assert.equal(receivedUserId, userId)
            return []
        })
        replaceMethod(ScheduleQueries, "getScheduleItems", async () => {
            throw new Error("getScheduleItems should not be called without a schedule")
        })

        const result = await ScheduleService.getSchedule(userId)

        assert.deepEqual(result, { events: [] })
    })

    it("loads schedule events for a user", async () => {
        replaceMethod(ScheduleQueries, "getScheduleId", async (receivedUserId: number) => {
            assert.equal(receivedUserId, userId)
            return [{ id: scheduleId }]
        })
        replaceMethod(ScheduleQueries, "getScheduleItems", async (receivedScheduleId: number) => {
            assert.equal(receivedScheduleId, scheduleId)
            return eventPayload.events
        })

        const result = await ScheduleService.getSchedule(userId)

        assert.deepEqual(result, { events: eventPayload.events })
    })

    it("returns a service error when schedule loading fails", async () => {
        replaceMethod(ScheduleQueries, "getScheduleId", async () => {
            throw new Error("select failed")
        })
        replaceMethod(console as unknown as MutableRecord, "error", () => undefined)

        const result = await ScheduleService.getSchedule(userId)

        assert.deepEqual(result, { error: "could not load schedule" })
    })

    it("creates or updates schedule events", async () => {
        const calls: string[] = []

        replaceMethod(ScheduleQueries, "createScheduleReturningId", async (receivedUserId: number) => {
            calls.push("createScheduleReturningId")
            assert.equal(receivedUserId, userId)
            return [{ id: scheduleId }]
        })
        replaceMethod(ScheduleQueries, "createOrUpdateEvent", async (data: typeof eventPayload, receivedScheduleId: number) => {
            calls.push("createOrUpdateEvent")
            assert.deepEqual(data, eventPayload)
            assert.equal(receivedScheduleId, scheduleId)
        })

        const result = await ScheduleService.updateSchedule(userId, eventPayload)

        assert.deepEqual(result, { message: "schedule updated!" })
        assert.deepEqual(calls, ["createScheduleReturningId", "createOrUpdateEvent"])
    })

    it("creates or updates schedule events without AM/PM periods", async () => {
        replaceMethod(ScheduleQueries, "createScheduleReturningId", async (receivedUserId: number) => {
            assert.equal(receivedUserId, userId)
            return [{ id: scheduleId }]
        })
        replaceMethod(ScheduleQueries, "createOrUpdateEvent", async (data: typeof twentyFourHourEventPayload, receivedScheduleId: number) => {
            assert.deepEqual(data, twentyFourHourEventPayload)
            assert.equal(receivedScheduleId, scheduleId)
        })

        const result = await ScheduleService.updateSchedule(userId, twentyFourHourEventPayload)

        assert.deepEqual(result, { message: "schedule updated!" })
    })

    it("returns a service error when schedule update fails", async () => {
        replaceMethod(ScheduleQueries, "createScheduleReturningId", async () => {
            throw new Error("upsert failed")
        })
        replaceMethod(console as unknown as MutableRecord, "error", () => undefined)

        const result = await ScheduleService.updateSchedule(userId, eventPayload)

        assert.deepEqual(result, { error: "nothing was changed" })
    })

    it("returns success when deleting from a user without a schedule", async () => {
        replaceMethod(ScheduleQueries, "getScheduleId", async (receivedUserId: number) => {
            assert.equal(receivedUserId, userId)
            return []
        })
        replaceMethod(ScheduleQueries, "deleteEvent", async () => {
            throw new Error("deleteEvent should not be called without a schedule")
        })

        const result = await ScheduleService.deleteEvent(userId, { events: [{ id: "event-1" }] })

        assert.deepEqual(result, { message: "event deleted!" })
    })

    it("deletes schedule events for a user", async () => {
        replaceMethod(ScheduleQueries, "getScheduleId", async (receivedUserId: number) => {
            assert.equal(receivedUserId, userId)
            return [{ id: scheduleId }]
        })
        replaceMethod(ScheduleQueries, "deleteEvent", async (data: { events: Array<{ id: string }> }, receivedScheduleId: number) => {
            assert.deepEqual(data, { events: [{ id: "event-1" }] })
            assert.equal(receivedScheduleId, scheduleId)
        })

        const result = await ScheduleService.deleteEvent(userId, { events: [{ id: "event-1" }] })

        assert.deepEqual(result, { message: "event deleted!" })
    })

    it("returns a service error when schedule delete fails", async () => {
        replaceMethod(ScheduleQueries, "getScheduleId", async () => [{ id: scheduleId }])
        replaceMethod(ScheduleQueries, "deleteEvent", async () => {
            throw new Error("delete failed")
        })
        replaceMethod(console as unknown as MutableRecord, "error", () => undefined)

        const result = await ScheduleService.deleteEvent(userId, { events: [{ id: "event-1" }] })

        assert.deepEqual(result, { error: "nothing was changed" })
    })
})
