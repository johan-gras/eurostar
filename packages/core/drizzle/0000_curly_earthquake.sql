CREATE TYPE "public"."claim_status" AS ENUM('pending', 'eligible', 'submitted', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."train_type" AS ENUM('e320', 'e300', 'classic', 'ruby');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pnr" varchar(6) NOT NULL,
	"tcn" varchar(12) NOT NULL,
	"train_id" uuid,
	"train_number" varchar(4) NOT NULL,
	"journey_date" date NOT NULL,
	"origin" varchar(10) NOT NULL,
	"destination" varchar(10) NOT NULL,
	"passenger_name" varchar(255) NOT NULL,
	"coach" varchar(3),
	"seat" varchar(5),
	"final_delay_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"delay_minutes" integer NOT NULL,
	"eligible_cash_amount" numeric(10, 2),
	"eligible_voucher_amount" numeric(10, 2),
	"status" "claim_status" DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claims_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE "trains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" varchar(20) NOT NULL,
	"train_number" varchar(4) NOT NULL,
	"date" date NOT NULL,
	"scheduled_departure" timestamp with time zone NOT NULL,
	"scheduled_arrival" timestamp with time zone NOT NULL,
	"actual_arrival" timestamp with time zone,
	"delay_minutes" integer,
	"train_type" "train_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trains_trip_id_unique" UNIQUE("trip_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_train_id_trains_id_fk" FOREIGN KEY ("train_id") REFERENCES "public"."trains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bookings_user_id" ON "bookings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_pnr" ON "bookings" USING btree ("pnr");--> statement-breakpoint
CREATE INDEX "idx_bookings_train_id" ON "bookings" USING btree ("train_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_journey_date" ON "bookings" USING btree ("journey_date");--> statement-breakpoint
CREATE INDEX "idx_claims_booking_id" ON "claims" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_claims_status" ON "claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_trains_date" ON "trains" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_trains_train_number" ON "trains" USING btree ("train_number");