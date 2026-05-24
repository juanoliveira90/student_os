"use server"

import { db } from "../../db/client.ts"
import { Schedule, ScheduleItems } from "../../db/schema.ts"
import type { add } from "./schedule.types.ts"

export const ScheduleQueries = {
    async createScheduleReturningId(userId: number) {
        await db.insert(Schedule).values({ user_id: userId }).returning({ id: Schedule.id })
    },

    async addItem(data: add) {
        await db.insert(ScheduleItems).values({ 
            schedule_id: data.scheduleId, day_of_week: data.dayOfWeek, 
            title: data.title, end_time: data.endTime, start_time: data.startTime 
        })
    }
}