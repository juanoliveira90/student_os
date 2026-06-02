ALTER TABLE "subjects" ADD COLUMN "user_id" bigint;--> statement-breakpoint
UPDATE "subjects"
SET "user_id" = "schedule"."user_id"
FROM "schedule_items"
JOIN "schedule" ON "schedule"."id" = "schedule_items"."schedule_id"
WHERE "subjects"."schedule_block" = "schedule_items"."id";--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
