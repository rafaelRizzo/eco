ALTER TABLE "dividends" ADD COLUMN "transaction_id" text;--> statement-breakpoint
ALTER TABLE "dividends" ADD CONSTRAINT "dividends_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dividends_transaction_id_idx" ON "dividends" USING btree ("transaction_id");