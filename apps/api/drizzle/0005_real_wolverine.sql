ALTER TABLE "projects" ADD COLUMN "google_client_id" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "google_client_secret" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "github_client_id" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "github_client_secret" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "auth_jwt_secret" text NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "site_url" text;