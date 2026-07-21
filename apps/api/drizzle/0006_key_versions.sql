ALTER TABLE "projects" ADD COLUMN "anon_key_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "service_role_key_version" integer DEFAULT 1 NOT NULL;
