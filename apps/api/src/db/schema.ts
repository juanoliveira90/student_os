import { 
    pgTable, pgEnum, 
    integer, varchar, text, time, timestamp, uuid, bigserial, bigint,
    index, unique 
} from "drizzle-orm/pg-core"

export const Users = pgTable("users", {
    id: bigserial({ mode: "number" }).primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    email: text().unique().notNull(),
    password: text(),
    created_at: timestamp({ precision: 0, withTimezone: true }).defaultNow(),
    updated_at: timestamp({ precision: 0, withTimezone: true }).defaultNow()
})

export const Accounts = pgTable("accounts", {
    id: bigserial({ mode: "number" }).primaryKey(),
    user_id: bigint({ mode: "number" }).references(() => Users.id, {
        onDelete: 'cascade'
    }),
    provider: text().notNull(),
    provider_account_id: text().notNull(),
    access_token: text(),
    refresh_token: text(),
}, (t) => [
    unique().on(t.provider, t.provider_account_id)
])

export const Schedule = pgTable("schedule", {
    id: bigserial({ mode: "number" }).primaryKey(),
    user_id: bigint({ mode: "number" }).references(() => Users.id, {
        onDelete: 'cascade'
    }),
    created_at: timestamp({ precision: 0, withTimezone: true }).defaultNow(),
    updated_at: timestamp({ precision: 0, withTimezone: true }).defaultNow()    
})

/*export const dayOfWeekEnum = pgEnum("day_of_week", [
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
])*/

export const ScheduleItems = pgTable("schedule_items", {
    id: bigserial({ mode: "number" }).primaryKey(),
    schedule_id: bigint({ mode: "number" }).references(() => Schedule.id, {
        onDelete: 'cascade'
    }),
    day_of_week: /*dayOfWeekEnum()*/varchar({ length: 10 }).notNull(),
    title: text().notNull(),
    start_time: time().notNull(),
    end_time: time().notNull()
})