CREATE TYPE "public"."compensation_type" AS ENUM('cash', 'voucher');--> statement-breakpoint
CREATE TYPE "public"."terminal" AS ENUM('st_pancras', 'paris_nord', 'brussels_midi', 'amsterdam_centraal');--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"seat_preferences" jsonb,
	"queue_notifications" boolean DEFAULT true NOT NULL,
	"default_terminal" "terminal",
	"preferred_compensation_type" "compensation_type",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;