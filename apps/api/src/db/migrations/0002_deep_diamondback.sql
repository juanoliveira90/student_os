ALTER TABLE "schedule_items" ALTER COLUMN "day_of_week" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "schedule_items" ADD COLUMN "start_period" varchar(2) NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_items" ADD COLUMN "end_period" varchar(2) NOT NULL;--> statement-breakpoint
DROP TYPE "public"."day_of_week";