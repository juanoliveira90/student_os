"use server"

import { db } from "../../db/client.ts"
import { Schedule, ScheduleItems } from "../../db/schema.ts"
import type { remove, add } from "./schedule.types.ts"
import { and, sql, inArray, eq } from "drizzle-orm"

export const ScheduleQueries = {
    async getScheduleItems(scheduleId: number) {
        return await db.select().from(ScheduleItems).where(eq(ScheduleItems.schedule_id, scheduleId))
    },

    async getScheduleId(userId: number) {
        return await db.select({ id: Schedule.id })
        .from(Schedule).where(eq(Schedule.user_id, userId))
    },

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
                tag: event.tag,
                description: event.description ?? null,
                end_time: event.end_time,
                start_time: event.start_time,
                start_period: event.start_period,
                end_period: event.end_period
            }))
        )
        .onConflictDoUpdate({
            target: ScheduleItems.id,
            setWhere: eq(ScheduleItems.schedule_id, scheduleId),
            set: {
                day_of_week: sql`excluded.day_of_week`,
                title: sql`excluded.title`,
                tag: sql`excluded.tag`,
                description: sql`excluded.description`,
                end_time: sql`excluded.end_time`,
                start_time: sql`excluded.start_time`,
                start_period: sql`excluded.start_period`,
                end_period: sql`excluded.end_period`
            }
        })
    },

    async deleteEvent(data: remove, scheduleId: number) {
        const eventIds = data.events.map((event) => event.id)
        await db.delete(ScheduleItems).where(and(
            inArray(ScheduleItems.id, eventIds),
            eq(ScheduleItems.schedule_id, scheduleId)
        ))
    }
}
