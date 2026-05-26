CREATE TYPE "public"."day_of_week" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TABLE "schedule" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint,
	"created_at" timestamp (0) with time zone DEFAULT now(),
	"updated_at" timestamp (0) with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedule_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"schedule_id" bigint,
	"day_of_week" "day_of_week" NOT NULL,
	"title" text NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL
);
--> statement-breakpoint
DROP TABLE "sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_items" ADD CONSTRAINT "schedule_items_schedule_id_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedule"("id") ON DELETE cascade ON UPDATE no action;