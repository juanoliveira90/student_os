"use server"

import { ScheduleQueries } from "./schedule.queries.ts"
import type { add } from "./schedule.types.ts"

export const ScheduleService = {
    async addEvent(userId: number, data: add) {        
        try {
            const schedule = await ScheduleQueries.createScheduleReturningId(userId)
            await ScheduleQueries.addEvent(data, schedule[0]!.id)
        } catch (error) {
            console.error(error)
            return { message: "event was not added" }
        }

        return { message: "event added!" }
    }
}