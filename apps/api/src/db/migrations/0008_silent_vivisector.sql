CREATE TABLE "study_plan_subtasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"study_plan_id" bigint,
	"name" varchar(50) NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "study_plans" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint,
	"name" varchar(50) NOT NULL,
	"schedule_block" uuid
);
--> statement-breakpoint
ALTER TABLE "study_plan_subtasks" ADD CONSTRAINT "study_plan_subtasks_study_plan_id_study_plans_id_fk" FOREIGN KEY ("study_plan_id") REFERENCES "public"."study_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_schedule_block_schedule_items_id_fk" FOREIGN KEY ("schedule_block") REFERENCES "public"."schedule_items"("id") ON DELETE no action ON UPDATE no action;