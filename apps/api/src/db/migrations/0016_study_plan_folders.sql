CREATE TABLE IF NOT EXISTS "study_plans" (
    "id" uuid PRIMARY KEY NOT NULL,
    "user_id" bigint REFERENCES "users"("id") ON DELETE cascade,
    "name" varchar(100) NOT NULL,
    "day_of_week" varchar(10),
    "start_time" time,
    "start_period" varchar(2),
    "end_time" time,
    "end_period" varchar(2),
    "schedule_block" uuid,
    "created_at" timestamp(0) with time zone DEFAULT now(),
    "updated_at" timestamp(0) with time zone DEFAULT now()
);

ALTER TABLE "schedule_items" ADD COLUMN IF NOT EXISTS "study_plan_id" uuid;
ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "study_plan_id" uuid;
ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "description" text;

DO $$ BEGIN
    ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_schedule_block_schedule_items_id_fk"
        FOREIGN KEY ("schedule_block") REFERENCES "schedule_items"("id") ON DELETE set null;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "schedule_items" ADD CONSTRAINT "schedule_items_study_plan_id_study_plans_id_fk"
        FOREIGN KEY ("study_plan_id") REFERENCES "study_plans"("id") ON DELETE set null;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "subjects" ADD CONSTRAINT "subjects_study_plan_id_study_plans_id_fk"
        FOREIGN KEY ("study_plan_id") REFERENCES "study_plans"("id") ON DELETE cascade;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
