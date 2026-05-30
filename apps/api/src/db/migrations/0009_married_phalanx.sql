CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"schedule_block" uuid,
	"created_at" timestamp (0) with time zone DEFAULT now(),
	"updated_at" timestamp (0) with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "study_plan_subtasks" RENAME TO "subjects_subtasks";--> statement-breakpoint
ALTER TABLE "subjects_subtasks" RENAME COLUMN "study_plan_id" TO "subject_id";--> statement-breakpoint
ALTER TABLE "subjects_subtasks" DROP CONSTRAINT "study_plan_subtasks_study_plan_id_study_plans_id_fk";
--> statement-breakpoint
ALTER TABLE "subjects_subtasks" DROP COLUMN "subject_id";--> statement-breakpoint
ALTER TABLE "subjects_subtasks" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
ALTER TABLE "study_plans" DROP CONSTRAINT "study_plans_schedule_block_schedule_items_id_fk";
--> statement-breakpoint
ALTER TABLE "subjects_subtasks" ADD COLUMN "created_at" timestamp (0) with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "subjects_subtasks" ADD COLUMN "updated_at" timestamp (0) with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_schedule_block_schedule_items_id_fk" FOREIGN KEY ("schedule_block") REFERENCES "public"."schedule_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects_subtasks" ADD CONSTRAINT "subjects_subtasks_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "study_plans" DROP COLUMN "schedule_block";
