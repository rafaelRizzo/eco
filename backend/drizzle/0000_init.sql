CREATE TYPE "public"."account_type" AS ENUM('checking', 'savings', 'cash', 'investment', 'other');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('open', 'closed', 'paid', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."job_run_status" AS ENUM('running', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('bill_due', 'bill_overdue', 'invoice_closed', 'invoice_due', 'invoice_overdue');--> statement-breakpoint
CREATE TYPE "public"."recurrence_frequency" AS ENUM('weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'paid', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(80) NOT NULL,
	"type" "account_type" DEFAULT 'checking' NOT NULL,
	"initial_balance_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(60) NOT NULL,
	"type" "transaction_type" NOT NULL,
	"color" varchar(7),
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(80) NOT NULL,
	"limit_cents" integer DEFAULT 0 NOT NULL,
	"closing_day" smallint NOT NULL,
	"due_day" smallint NOT NULL,
	"payment_account_id" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_cards_closing_day_check" CHECK ("credit_cards"."closing_day" between 1 and 31),
	CONSTRAINT "credit_cards_due_day_check" CHECK ("credit_cards"."due_day" between 1 and 31)
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"credit_card_id" text NOT NULL,
	"reference_month" varchar(7) NOT NULL,
	"closing_date" date NOT NULL,
	"due_date" date NOT NULL,
	"status" "invoice_status" DEFAULT 'open' NOT NULL,
	"paid_at" timestamp (3) with time zone,
	"paid_amount_cents" integer,
	"paid_from_account_id" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"job_name" varchar(80) NOT NULL,
	"run_key" varchar(80) NOT NULL,
	"status" "job_run_status" DEFAULT 'running' NOT NULL,
	"started_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp (3) with time zone,
	"result" jsonb,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(160) NOT NULL,
	"message" varchar(500) NOT NULL,
	"transaction_id" text,
	"invoice_id" text,
	"dedupe_key" varchar(200) NOT NULL,
	"read_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"description" varchar(160) NOT NULL,
	"amount_cents" integer NOT NULL,
	"type" "transaction_type" NOT NULL,
	"frequency" "recurrence_frequency" DEFAULT 'monthly' NOT NULL,
	"category_id" text,
	"account_id" text,
	"credit_card_id" text,
	"start_date" date NOT NULL,
	"end_date" date,
	"anchor_day" smallint NOT NULL,
	"next_run_date" date NOT NULL,
	"last_run_date" date,
	"auto_pay" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_transactions_target_check" CHECK (("recurring_transactions"."account_id" is null) <> ("recurring_transactions"."credit_card_id" is null)),
	CONSTRAINT "recurring_transactions_amount_check" CHECK ("recurring_transactions"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "transaction_type" NOT NULL,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"description" varchar(160) NOT NULL,
	"amount_cents" integer NOT NULL,
	"date" date NOT NULL,
	"paid_at" timestamp (3) with time zone,
	"category_id" text,
	"account_id" text,
	"credit_card_id" text,
	"invoice_id" text,
	"recurring_transaction_id" text,
	"installment_group_id" text,
	"installment_number" smallint,
	"installment_total" smallint,
	"notes" varchar(500),
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_target_check" CHECK (("transactions"."account_id" is null) <> ("transactions"."credit_card_id" is null)),
	CONSTRAINT "transactions_amount_check" CHECK ("transactions"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(254) NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_payment_account_id_accounts_id_fk" FOREIGN KEY ("payment_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_paid_from_account_id_accounts_id_fk" FOREIGN KEY ("paid_from_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_transaction_id_fk" FOREIGN KEY ("recurring_transaction_id") REFERENCES "public"."recurring_transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "categories_user_id_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_name_type_unique" ON "categories" USING btree ("user_id","name","type");--> statement-breakpoint
CREATE INDEX "credit_cards_user_id_idx" ON "credit_cards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_cards_payment_account_id_idx" ON "credit_cards" USING btree ("payment_account_id");--> statement-breakpoint
CREATE INDEX "invoices_user_id_idx" ON "invoices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invoices_credit_card_id_idx" ON "invoices" USING btree ("credit_card_id");--> statement-breakpoint
CREATE INDEX "invoices_paid_from_account_id_idx" ON "invoices" USING btree ("paid_from_account_id");--> statement-breakpoint
CREATE INDEX "invoices_status_due_date_idx" ON "invoices" USING btree ("status","due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_card_reference_month_unique" ON "invoices" USING btree ("credit_card_id","reference_month");--> statement-breakpoint
CREATE UNIQUE INDEX "job_runs_job_name_run_key_unique" ON "job_runs" USING btree ("job_name","run_key");--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_transaction_id_idx" ON "notifications" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "notifications_invoice_id_idx" ON "notifications" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_dedupe_key_unique" ON "notifications" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "recurring_transactions_user_id_idx" ON "recurring_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recurring_transactions_category_id_idx" ON "recurring_transactions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "recurring_transactions_account_id_idx" ON "recurring_transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "recurring_transactions_credit_card_id_idx" ON "recurring_transactions" USING btree ("credit_card_id");--> statement-breakpoint
CREATE INDEX "recurring_transactions_active_next_run_idx" ON "recurring_transactions" USING btree ("active","next_run_date");--> statement-breakpoint
CREATE INDEX "transactions_user_id_date_idx" ON "transactions" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "transactions_category_id_idx" ON "transactions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "transactions_account_id_idx" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "transactions_credit_card_id_idx" ON "transactions" USING btree ("credit_card_id");--> statement-breakpoint
CREATE INDEX "transactions_invoice_id_idx" ON "transactions" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "transactions_installment_group_id_idx" ON "transactions" USING btree ("installment_group_id");--> statement-breakpoint
CREATE INDEX "transactions_status_date_idx" ON "transactions" USING btree ("status","date");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_recurring_date_unique" ON "transactions" USING btree ("recurring_transaction_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");