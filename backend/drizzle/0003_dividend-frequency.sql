CREATE TYPE "public"."dividend_frequency" AS ENUM('none', 'monthly', 'quarterly', 'semiannual', 'annual');--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "dividend_frequency" "dividend_frequency" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "dividends" ADD COLUMN "amount_per_unit" numeric(14, 6);--> statement-breakpoint
-- FIIs já cadastrados mantêm o comportamento anterior (estimativa mensal).
UPDATE "assets" SET "dividend_frequency" = 'monthly' WHERE "class" = 'reit';
