CREATE TYPE "public"."asset_class" AS ENUM('stock', 'reit', 'crypto', 'currency', 'other');--> statement-breakpoint
CREATE TYPE "public"."dividend_kind" AS ENUM('dividend', 'jcp', 'yield', 'other');--> statement-breakpoint
CREATE TYPE "public"."trade_type" AS ENUM('buy', 'sell');--> statement-breakpoint
CREATE TABLE "asset_trades" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"type" "trade_type" NOT NULL,
	"quantity" numeric(20, 8) NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"fees_cents" integer DEFAULT 0 NOT NULL,
	"traded_at" date NOT NULL,
	"notes" varchar(500),
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_trades_quantity_check" CHECK ("asset_trades"."quantity" > 0),
	CONSTRAINT "asset_trades_unit_price_check" CHECK ("asset_trades"."unit_price_cents" >= 0),
	CONSTRAINT "asset_trades_fees_check" CHECK ("asset_trades"."fees_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"name" varchar(80) NOT NULL,
	"class" "asset_class" NOT NULL,
	"current_price_cents" integer,
	"price_updated_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_current_price_check" CHECK ("assets"."current_price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "dividends" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"kind" "dividend_kind" NOT NULL,
	"quantity" numeric(20, 8) NOT NULL,
	"total_cents" integer NOT NULL,
	"com_date" date,
	"pay_date" date NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dividends_quantity_check" CHECK ("dividends"."quantity" > 0),
	CONSTRAINT "dividends_dates_check" CHECK ("dividends"."com_date" is null or "dividends"."com_date" <= "dividends"."pay_date"),
	CONSTRAINT "dividends_total_check" CHECK ("dividends"."total_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "asset_trades" ADD CONSTRAINT "asset_trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_trades" ADD CONSTRAINT "asset_trades_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dividends" ADD CONSTRAINT "dividends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dividends" ADD CONSTRAINT "dividends_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_trades_user_id_traded_at_idx" ON "asset_trades" USING btree ("user_id","traded_at");--> statement-breakpoint
CREATE INDEX "asset_trades_asset_id_idx" ON "asset_trades" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_user_id_ticker_unique" ON "assets" USING btree ("user_id","ticker");--> statement-breakpoint
CREATE INDEX "dividends_user_id_pay_date_idx" ON "dividends" USING btree ("user_id","pay_date");--> statement-breakpoint
CREATE INDEX "dividends_asset_id_idx" ON "dividends" USING btree ("asset_id");