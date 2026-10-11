ALTER TABLE "assets" ADD COLUMN "dividend_per_unit" numeric(14, 6);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "next_dividend_date" date;