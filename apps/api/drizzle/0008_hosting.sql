-- Hosting: GitHub connections, sites, env, deployments
CREATE TABLE IF NOT EXISTS "hosting_github_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE cascade,
  "github_user_id" text NOT NULL,
  "github_login" text NOT NULL,
  "access_token" text NOT NULL,
  "scope" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hosted_sites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "github_owner" text NOT NULL,
  "github_repo" text NOT NULL,
  "github_repo_id" text,
  "branch" text DEFAULT 'main' NOT NULL,
  "root_directory" text DEFAULT '' NOT NULL,
  "framework" text DEFAULT 'vite' NOT NULL,
  "build_command" text DEFAULT 'npm run build' NOT NULL,
  "output_directory" text DEFAULT 'dist' NOT NULL,
  "install_command" text DEFAULT 'npm install' NOT NULL,
  "cf_pages_project_name" text NOT NULL,
  "production_url" text,
  "pages_dev_url" text,
  "status" text DEFAULT 'idle' NOT NULL,
  "last_deploy_id" text,
  "last_deploy_status" text,
  "last_commit_sha" text,
  "last_error" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hosted_sites_project_id_uidx" ON "hosted_sites" ("project_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hosted_site_env" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "hosted_site_id" uuid NOT NULL REFERENCES "hosted_sites"("id") ON DELETE cascade,
  "key" text NOT NULL,
  "value" text NOT NULL,
  "is_secret" boolean DEFAULT false NOT NULL,
  "is_system" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hosted_deployments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "hosted_site_id" uuid NOT NULL REFERENCES "hosted_sites"("id") ON DELETE cascade,
  "cf_deployment_id" text,
  "status" text DEFAULT 'queued' NOT NULL,
  "stage" text DEFAULT 'queued' NOT NULL,
  "url" text,
  "commit_sha" text,
  "commit_message" text,
  "environment" text DEFAULT 'production' NOT NULL,
  "error_message" text,
  "duration_ms" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
