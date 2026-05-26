"use server"

import { ScheduleQueries } from "./schedule.queries.ts"
import type { remove, add } from "./schedule.types.ts"

export const ScheduleService = {
    async updateSchedule(userId: number, data: add) {        
        try {
            const schedule = await ScheduleQueries.createScheduleReturningId(userId)
            await ScheduleQueries.createOrUpdateEvent(data, schedule[0]!.id)
        } catch (error) {
            console.error(error)
            return { error: "nothing was changed" }
        }

        return { message: "schedule updated!" }
    },

    async deleteEvent(userId: number, data: remove) {
        try {
            const schedule = await ScheduleQueries.getScheduleId(userId)
            if (!schedule[0]) {
                return { message: "event deleted!" }
            }

            await ScheduleQueries.deleteEvent(data, schedule[0].id)
        } catch (error) {
            console.error(error)
            return { error: "nothing was changed" }
        }

        return { message: "event deleted!" }
    }
}
