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
  
  async createOrUpdateEvent(data: add, scheduleId: number) {
    await db.insert(ScheduleItems).values(
        data.events.map((event) => ({
            id: event.id,
            schedule_id: scheduleId,
            day_of_week: event.day_of_week,
            title: event.title,
            end_time: event.end_time,
            start_time: event.start_time,
            start_period: event.start_period,
            end_period: event.end_period
        }))
    )
    .onConflictDoUpdate({
        target: ScheduleItems.id,
        set: {
            day_of_week: sql`excluded.day_of_week`,
            title: sql`excluded.title`,
            end_time: sql`excluded.end_time`,
            start_time: sql`excluded.start_time`,
            start_period: sql`excluded.start_period`,
            end_period: sql`excluded.end_period`
        }
    })
  }
}