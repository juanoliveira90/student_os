-- Custom SQL migration file, put your code below! --
ALTER TABLE "schedule_items" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;