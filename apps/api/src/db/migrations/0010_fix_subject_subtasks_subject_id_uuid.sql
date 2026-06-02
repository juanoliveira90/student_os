DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subjects_subtasks'
      AND column_name = 'subject_id'
      AND udt_name <> 'uuid'
  ) THEN
    ALTER TABLE "subjects_subtasks" DROP CONSTRAINT IF EXISTS "subjects_subtasks_subject_id_subjects_id_fk";
    ALTER TABLE "subjects_subtasks" DROP COLUMN "subject_id";
    ALTER TABLE "subjects_subtasks" ADD COLUMN "subject_id" uuid;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subjects_subtasks'
      AND column_name = 'subject_id'
  ) THEN
    ALTER TABLE "subjects_subtasks" ADD COLUMN "subject_id" uuid;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "subjects_subtasks" DROP CONSTRAINT IF EXISTS "subjects_subtasks_subject_id_subjects_id_fk";
--> statement-breakpoint
ALTER TABLE "subjects_subtasks" ADD CONSTRAINT "subjects_subtasks_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;
