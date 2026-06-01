CREATE TABLE "notes" (
    "id" uuid PRIMARY KEY NOT NULL,
    "user_id" bigint,
    "subject_id" uuid,
    "title" varchar(100) NOT NULL,
    "content" text NOT NULL,
    "created_at" timestamp(0) with time zone DEFAULT now(),
    "updated_at" timestamp(0) with time zone DEFAULT now()
);

ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notes" ADD CONSTRAINT "notes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;
