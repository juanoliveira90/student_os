"use server"

import { db } from "../../db/client.ts"
import { Schedule, ScheduleItems } from "../../db/schema.ts"
import type { add } from "./schedule.types.ts"
import { sql } from "drizzle-orm"

export const ScheduleQueries = {
    async createScheduleReturningId(userId: number) {
        return await db.insert(Schedule).values({ user_id: userId })
        .onConflictDoUpdate({ 
            target: Schedule.user_id,
            set: {
                user_id: sql`${Schedule.user_id}`
            }
        })
        .returning({ id: Schedule.id })
    },

    async addEvent(data: add, scheduleId: number) {
        await db.insert(ScheduleItems).values({ 
            schedule_id: scheduleId, 
            day_of_week: data.events[0]!.day_of_week, 
            title: data.events[0]!.title, 
            end_time: data.events[0]!.end_time, 
            start_time: data.events[0]!.start_time,
            start_period: data.events[0]!.start_period,
            end_period: data.events[0]!.end_period 
        })
    }
}