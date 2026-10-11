DROP INDEX "categories_user_id_idx";--> statement-breakpoint
DROP INDEX "invoices_user_id_idx";--> statement-breakpoint
DROP INDEX "recurring_transactions_active_next_run_idx";--> statement-breakpoint
DROP INDEX "transactions_status_date_idx";--> statement-breakpoint
CREATE INDEX "invoices_user_id_due_date_idx" ON "invoices" USING btree ("user_id","due_date");--> statement-breakpoint
CREATE INDEX "notifications_user_id_unread_idx" ON "notifications" USING btree ("user_id","created_at") WHERE "notifications"."read_at" is null;--> statement-breakpoint
CREATE INDEX "recurring_transactions_next_run_idx" ON "recurring_transactions" USING btree ("next_run_date") WHERE "recurring_transactions"."active" = true;--> statement-breakpoint
CREATE INDEX "transactions_open_date_idx" ON "transactions" USING btree ("date") WHERE "transactions"."status" in ('pending', 'overdue');--> statement-breakpoint
CREATE INDEX "transactions_user_open_account_date_idx" ON "transactions" USING btree ("user_id","date") WHERE "transactions"."status" in ('pending', 'overdue') and "transactions"."credit_card_id" is null;--> statement-breakpoint
CREATE INDEX "transactions_account_paid_idx" ON "transactions" USING btree ("account_id","type","amount_cents") WHERE "transactions"."status" = 'paid';