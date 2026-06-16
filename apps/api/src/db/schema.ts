import {
    bigint,
    bigserial,
    pgTable,
    text, time, timestamp,
    unique,
    uuid,
    varchar,
    boolean
} from "drizzle-orm/pg-core"

import type { AnyPgColumn } from "drizzle-orm/pg-core"

export const Users = pgTable("users", {
    id: bigserial({ mode: "number" }).primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    email: text().unique().notNull(),
    password: text(),
    created_at: timestamp({ precision: 0, withTimezone: true }).defaultNow(),
    updated_at: timestamp({ precision: 0, withTimezone: true }).defaultNow(),
    email_verified: boolean().default(false)
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

export const StudyPlans = pgTable("study_plans", {
    id: uuid().primaryKey(),
    user_id: bigint({ mode: "number" }).references(() => Users.id, {
        onDelete: 'cascade'
    }),
    name: varchar({ length: 100 }).notNull(),
    day_of_week: varchar({ length: 10 }),
    start_time: time(),
    start_period: varchar({ length: 2 }),
    end_time: time(),
    end_period: varchar({ length: 2 }),
    schedule_block_id: uuid("schedule_block").references((): AnyPgColumn => ScheduleItems.id, {
        onDelete: 'set null'
    }),
    created_at: timestamp({ precision: 0, withTimezone: true }).defaultNow(),
    updated_at: timestamp({ precision: 0, withTimezone: true }).defaultNow()
})

/*export const dayOfWeekEnum = pgEnum("day_of_week", [
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
])*/

export const ScheduleItems = pgTable("schedule_items", {
    id: uuid("id").primaryKey(),
    schedule_id: bigint({ mode: "number" }).references(() => Schedule.id, {
        onDelete: 'cascade'
    }),
    study_plan_id: uuid("study_plan_id").references(() => StudyPlans.id, {
        onDelete: 'set null'
    }),
    tag: text(),    
    day_of_week: /*dayOfWeekEnum()*/varchar({ length: 10 }).notNull(),
    title: text().notNull(),
    description: text(),
    start_time: time().notNull(),
    start_period: varchar({ length: 2 }),
    end_time: time().notNull(),
    end_period: varchar({ length: 2 }),
    //is_recurring: boolean().notNull()
})

export const Subjects = pgTable("subjects", {
    id: uuid().primaryKey(),
    user_id: bigint({ mode: "number" }).references(() => Users.id, {
        onDelete: 'cascade'
    }),
    study_plan_id: uuid("study_plan_id").references(() => StudyPlans.id, {
        onDelete: 'cascade'
    }),
    name: varchar({ length: 50 }).notNull(),
    description: text(),
    tag: text(),
    schedule_block_id: uuid("schedule_block").references(() => ScheduleItems.id, {
        onDelete: 'cascade'
    }),
    created_at: timestamp({ precision: 0, withTimezone: true }).defaultNow(),
    updated_at: timestamp({ precision: 0, withTimezone: true }).defaultNow()    
})

export const SubjectSubtasks = pgTable("subjects_subtasks", {
    id: uuid().primaryKey(),
    subject_id: uuid().references(() => Subjects.id, {
        onDelete: 'cascade'
    }),
    name: varchar({ length: 50 }).notNull(),
    description: text(),
    done: boolean().notNull().default(false),
    created_at: timestamp({ precision: 0, withTimezone: true }).defaultNow(),
    updated_at: timestamp({ precision: 0, withTimezone: true }).defaultNow()
})

export const Notes = pgTable("notes", {
    id: uuid().primaryKey(),
    user_id: bigint({ mode: "number" }).references(() => Users.id, {
        onDelete: 'cascade'
    }),
    title: varchar({ length: 100 }).notNull(),
    content: text().notNull(),
    created_at: timestamp({ precision: 0, withTimezone: true }).defaultNow(),
    updated_at: timestamp({ precision: 0, withTimezone: true }).defaultNow()
})

export const EmailVerification = pgTable("email_verification", {
    id: bigserial({ mode: "number" }).primaryKey(),
    user_id: bigint({ mode: "number" }).references(() => Users.id, {
        onDelete: 'cascade'
    }),
    code_hash: text().notNull(),
    expires_at: timestamp().notNull(),
    used: boolean().default(false),
    created_at: timestamp({ precision: 0, withTimezone: true }).defaultNow(),
})
