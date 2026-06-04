CREATE TABLE "email_verification" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint,
	"code_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"created_at" timestamp (0) with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" bigint,
	"title" varchar(100) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp (0) with time zone DEFAULT now(),
	"updated_at" timestamp (0) with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "study_plans" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "study_plans" CASCADE;--> statement-breakpoint
ALTER TABLE "subjects_subtasks" DROP CONSTRAINT "subjects_subtasks_subject_id_subjects_id_fk";
--> statement-breakpoint
ALTER TABLE "subjects" DROP CONSTRAINT "subjects_schedule_block_schedule_items_id_fk";
--> statement-breakpoint
ALTER TABLE "schedule_items" ADD COLUMN "tag" text;--> statement-breakpoint
ALTER TABLE "subjects_subtasks" ADD COLUMN "done" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "user_id" bigint;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "tag" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "email_verification" ADD CONSTRAINT "email_verification_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects_subtasks" ADD CONSTRAINT "subjects_subtasks_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_schedule_block_schedule_items_id_fk" FOREIGN KEY ("schedule_block") REFERENCES "public"."schedule_items"("id") ON DELETE cascade ON UPDATE no action;