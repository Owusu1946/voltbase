CREATE TABLE "project_migrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"name" text NOT NULL,
	"sql" text NOT NULL,
	"checksum" text NOT NULL,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"applied_by" uuid
);
--> statement-breakpoint
ALTER TABLE "project_migrations" ADD CONSTRAINT "project_migrations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
