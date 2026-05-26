"use server"

import { ScheduleQueries } from "./schedule.queries.ts"
import type { add } from "./schedule.types.ts"

export const ScheduleService = {
    async updateSchedule(userId: number, data: add) {        
        try {
            const schedule = await ScheduleQueries.createScheduleReturningId(userId)
            await ScheduleQueries.createOrUpdateEvent(data, schedule[0]!.id)
        } catch (error) {
            console.error(error)
            return { message: "nothing was changed" }
        }

        return { message: "schedule updated!" }
    },
}