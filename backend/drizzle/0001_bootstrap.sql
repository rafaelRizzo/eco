CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'user');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'blocked');--> statement-breakpoint
CREATE TABLE "system_setup" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"completed_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"super_admin_id" text,
	CONSTRAINT "system_setup_singleton_check" CHECK ("system_setup"."id" = 'default')
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" "user_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "system_setup" ADD CONSTRAINT "system_setup_super_admin_id_users_id_fk" FOREIGN KEY ("super_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;