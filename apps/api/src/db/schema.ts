import {
    bigint,
    bigserial,
    pgTable,
    text, time, timestamp,
    unique,
    uuid,
    varchar
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
}, (t) => [
    unique().on(t.user_id)
])

/*export const dayOfWeekEnum = pgEnum("day_of_week", [
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
])*/

export const ScheduleItems = pgTable("schedule_items", {
    id: uuid("id").primaryKey(),
    schedule_id: bigint({ mode: "number" }).references(() => Schedule.id, {
        onDelete: 'cascade'
    }),
    day_of_week: /*dayOfWeekEnum()*/varchar({ length: 10 }).notNull(),
    title: text().notNull(),
    description: text(),
    start_time: time().notNull(),
    start_period: varchar({ length: 2 }).notNull(),
    end_time: time().notNull(),
    end_period: varchar({ length: 2 }).notNull(),
    //is_recurring: boolean().notNull()
})

/* 
study plan tem: 
    id,
    name
    schedule block (opcional),

study plan subtasks tem:
    id,
    study plan id,
    name,
    description
 */


export const StudyPlans = pgTable("study_plans", {
    id: bigserial({ mode: "number" }).primaryKey(),
    user_id: bigint({ mode: "number" }).references(() => Users.id),
})

export const Subjects = pgTable("subjects", {
    id: uuid().primaryKey(),
    name: varchar({ length: 50 }).notNull(),
    schedule_block_id: uuid("schedule_block").references(() => ScheduleItems.id),
    created_at: timestamp({ precision: 0, withTimezone: true }).defaultNow(),
    updated_at: timestamp({ precision: 0, withTimezone: true }).defaultNow()    
})

export const SubjectSubtasks = pgTable("subjects_subtasks", {
    id: uuid().primaryKey(),
    subject_id: uuid().references(() => Subjects.id),
    name: varchar({ length: 50 }).notNull(),
    description: text(),
    created_at: timestamp({ precision: 0, withTimezone: true }).defaultNow(),
    updated_at: timestamp({ precision: 0, withTimezone: true }).defaultNow()
})