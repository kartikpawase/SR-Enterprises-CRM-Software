CREATE TYPE "public"."address_type" AS ENUM('BILLING', 'SERVICE', 'BOTH');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('ACTIVE', 'IN_SERVICE', 'REPLACED', 'DECOMMISSIONED');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('RO_MACHINE', 'SPARE_PART');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('CREATE', 'UPDATE', 'DELETE', 'ARCHIVE', 'RESTORE', 'LOGIN', 'LOGOUT', 'PERMISSION_CHANGE', 'CANCEL');--> statement-breakpoint
CREATE TYPE "public"."customer_event_type" AS ENUM('CUSTOMER_CREATED', 'CUSTOMER_UPDATED', 'CUSTOMER_ARCHIVED', 'SALE_COMPLETED', 'INVOICE_GENERATED', 'INVOICE_SENT', 'PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'SERVICE_SCHEDULED', 'SERVICE_COMPLETED', 'JOB_CARD_CREATED', 'JOB_CARD_COMPLETED', 'WARRANTY_ACTIVATED', 'WARRANTY_EXPIRING', 'WARRANTY_EXPIRED', 'WARRANTY_REPLACEMENT', 'INQUIRY_CONVERTED');--> statement-breakpoint
CREATE TYPE "public"."customer_status" AS ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('INDIVIDUAL', 'COMMERCIAL');--> statement-breakpoint
CREATE TYPE "public"."document_entity_type" AS ENUM('CUSTOMER', 'SALE', 'INVOICE', 'SERVICE', 'JOB_CARD', 'PRODUCT', 'WARRANTY');--> statement-breakpoint
CREATE TYPE "public"."inquiry_source" AS ENUM('WEBSITE', 'DIRECT_CALL', 'REFERRAL', 'SOCIAL', 'WALK_IN');--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('NEW', 'CONTACTED', 'IN_PROGRESS', 'CONVERTED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."invoice_item_type" AS ENUM('PRODUCT', 'SERVICE', 'SPARE_PART', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."job_card_status" AS ENUM('SCHEDULED', 'ASSIGNED', 'STARTED', 'DIAGNOSIS', 'IN_PROGRESS', 'COMPLETED', 'CUSTOMER_CONFIRMED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('SERVICE_DUE', 'WARRANTY_EXPIRING', 'PAYMENT_DUE', 'PAYMENT_OVERDUE', 'NEW_INQUIRY', 'JOB_CARD_UPDATE', 'SYSTEM_ALERT');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('COMPLETED', 'PENDING', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('RO_MACHINE', 'SPARE_PART');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('DRAFT', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."service_classification" AS ENUM('GENERAL', 'WARRANTY');--> statement-breakpoint
CREATE TYPE "public"."service_location" AS ENUM('DOORSTEP', 'IN_SHOP');--> statement-breakpoint
CREATE TYPE "public"."service_priority" AS ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."service_schedule_status" AS ENUM('PENDING', 'SERVICE_CREATED', 'COMPLETED', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('INSTALLATION', 'REPAIR', 'PERIODIC_MAINTENANCE', 'EMERGENCY', 'SPARE_REPLACEMENT');--> statement-breakpoint
CREATE TYPE "public"."storage_provider" AS ENUM('S3_R2', 'LOCAL');--> statement-breakpoint
CREATE TYPE "public"."technician_status" AS ENUM('ACTIVE', 'ON_LEAVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('Super Admin', 'Admin', 'Staff', 'Technician');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."warranty_event_type" AS ENUM('ACTIVATED', 'EXTENDED', 'CLAIM_FILED', 'REPLACEMENT_APPROVED', 'REPLACEMENT_COMPLETED', 'VOIDED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."warranty_status" AS ENUM('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'VOID');--> statement-breakpoint
CREATE TYPE "public"."warranty_type" AS ENUM('STANDARD_MACHINE', 'EXTENDED_MACHINE', 'SPARE_PART');--> statement-breakpoint
CREATE TYPE "public"."inventory_transaction_type" AS ENUM('PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'TRANSFER');--> statement-breakpoint
CREATE TYPE "public"."reminder_type" AS ENUM('PAYMENT_FOLLOW_UP', 'OVERDUE_PAYMENT', 'INVOICE_DUE', 'SERVICE_DUE', 'WARRANTY_EXPIRY', 'CUSTOMER_FOLLOW_UP');--> statement-breakpoint
CREATE TYPE "public"."reminder_status" AS ENUM('PENDING', 'COMPLETED', 'CANCELLED', 'MISSED');--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"module" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"role" "user_role" DEFAULT 'Staff' NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"address_type" "address_type" DEFAULT 'SERVICE' NOT NULL,
	"address_line1" text NOT NULL,
	"address_line2" text,
	"landmark" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"postal_code" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_number" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"customer_type" "customer_type" DEFAULT 'INDIVIDUAL' NOT NULL,
	"company_name" text,
	"gst_number" text,
	"status" "customer_status" DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "customers_customer_number_unique" UNIQUE("customer_number")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"product_type" "product_type" NOT NULL,
	"brand" text NOT NULL,
	"model" text,
	"description" text,
	"unit_price" numeric(12, 2) NOT NULL,
	"tax_rate_percent" numeric(5, 2) DEFAULT '18.00' NOT NULL,
	"default_warranty_months" integer DEFAULT 12 NOT NULL,
	"default_service_interval_months" integer DEFAULT 6 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "customer_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_number" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"asset_type" "asset_type" NOT NULL,
	"serial_number" text,
	"custom_name" text,
	"installation_address_id" uuid,
	"purchase_date" timestamp with time zone NOT NULL,
	"initial_warranty_months" integer DEFAULT 12 NOT NULL,
	"service_interval_months" integer DEFAULT 6 NOT NULL,
	"status" "asset_status" DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_assets_asset_number_unique" UNIQUE("asset_number")
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name_snapshot" text NOT NULL,
	"sku_snapshot" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_snapshot" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"tax_rate_percent" numeric(5, 2) DEFAULT '18.00' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"warranty_months" integer DEFAULT 12 NOT NULL,
	"service_interval_months" integer DEFAULT 6 NOT NULL,
	"serial_number" text,
	"next_service_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_number" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"sale_date" timestamp with time zone NOT NULL,
	"status" "sale_status" DEFAULT 'COMPLETED' NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	CONSTRAINT "sales_sale_number_unique" UNIQUE("sale_number")
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"product_id" uuid,
	"item_type" "invoice_item_type" DEFAULT 'PRODUCT' NOT NULL,
	"name_snapshot" text NOT NULL,
	"description_snapshot" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_snapshot" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"tax_rate_percent" numeric(5, 2) DEFAULT '18.00' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"sale_id" uuid,
	"job_card_id" uuid,
	"service_id" uuid,
	"invoice_date" timestamp with time zone NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"status" "invoice_status" DEFAULT 'ISSUED' NOT NULL,
	"notes" text,
	"terms_and_conditions" text,
	"pdf_file_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_number" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_date" timestamp with time zone NOT NULL,
	"payment_method" "payment_method" DEFAULT 'CASH' NOT NULL,
	"status" "payment_status" DEFAULT 'COMPLETED' NOT NULL,
	"reference_number" text,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_payment_number_unique" UNIQUE("payment_number")
);
--> statement-breakpoint
CREATE TABLE "warranties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warranty_number" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"sale_id" uuid,
	"warranty_type" "warranty_type" NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"duration_months" integer NOT NULL,
	"status" "warranty_status" DEFAULT 'ACTIVE' NOT NULL,
	"terms" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "warranties_warranty_number_unique" UNIQUE("warranty_number")
);
--> statement-breakpoint
CREATE TABLE "warranty_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warranty_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"event_type" "warranty_event_type" NOT NULL,
	"event_date" timestamp with time zone NOT NULL,
	"actor_id" uuid,
	"reason" text,
	"notes" text,
	"replacement_asset_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"warranty_id" uuid,
	"schedule_index" integer NOT NULL,
	"total_schedules" integer NOT NULL,
	"planned_date" timestamp with time zone NOT NULL,
	"target_month" text NOT NULL,
	"status" "service_schedule_status" DEFAULT 'PENDING' NOT NULL,
	"generated_service_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_number" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"warranty_id" uuid,
	"technician_id" uuid,
	"service_type" "service_type" NOT NULL,
	"service_location" "service_location" DEFAULT 'DOORSTEP' NOT NULL,
	"service_classification" "service_classification" DEFAULT 'GENERAL' NOT NULL,
	"scheduled_date" timestamp with time zone NOT NULL,
	"scheduled_time_slot" text,
	"status" "service_status" DEFAULT 'SCHEDULED' NOT NULL,
	"priority" "service_priority" DEFAULT 'NORMAL' NOT NULL,
	"customer_notes" text,
	"internal_notes" text,
	"completed_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	CONSTRAINT "services_service_number_unique" UNIQUE("service_number")
);
--> statement-breakpoint
CREATE TABLE "job_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_card_number" text NOT NULL,
	"service_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"technician_id" uuid,
	"problem_reported" text,
	"diagnosis" text,
	"work_performed" text,
	"parts_replaced" jsonb,
	"technician_notes" text,
	"customer_remarks" text,
	"customer_signature_file_id" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"labor_charges" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"parts_charges" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total_charges" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"next_service_recommendation_months" integer,
	"next_service_notes" text,
	"status" "job_card_status" DEFAULT 'SCHEDULED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_cards_job_card_number_unique" UNIQUE("job_card_number"),
	CONSTRAINT "job_cards_service_id_unique" UNIQUE("service_id")
);
--> statement-breakpoint
CREATE TABLE "technicians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"status" "technician_status" DEFAULT 'ACTIVE' NOT NULL,
	"skills" text[],
	"address" text,
	"emergency_contact" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "technicians_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "technicians_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_number" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"message" text,
	"product_interest" text,
	"service_interest" text,
	"source" "inquiry_source" DEFAULT 'WEBSITE' NOT NULL,
	"status" "inquiry_status" DEFAULT 'NEW' NOT NULL,
	"assigned_to_user_id" uuid,
	"follow_up_date" timestamp with time zone,
	"notes" text,
	"converted_customer_id" uuid,
	"converted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inquiries_inquiry_number_unique" UNIQUE("inquiry_number")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"target_role" "user_role",
	"notification_type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"priority" "service_priority" DEFAULT 'NORMAL' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"entity_type" text,
	"entity_id" text,
	"action_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"actor_id" uuid,
	"actor_name" text,
	"event_type" "customer_event_type" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_username" text,
	"action" "audit_action" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"change_reason" text,
	"request_id" text,
	"ip_address" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"entity_type" "document_entity_type" NOT NULL,
	"entity_id" text,
	"storage_provider" "storage_provider" DEFAULT 'S3_R2' NOT NULL,
	"public_url" text,
	"uploaded_by_user_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_file_key_unique" UNIQUE("file_key")
);
--> statement-breakpoint
CREATE TABLE "business_sequences" (
	"name" text PRIMARY KEY NOT NULL,
	"prefix" text NOT NULL,
	"current_val" bigint DEFAULT 0 NOT NULL,
	"padding" integer DEFAULT 4 NOT NULL,
	"year_reset" boolean DEFAULT true NOT NULL,
	"current_year" integer DEFAULT 2026 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL UNIQUE,
	"current_stock" integer DEFAULT 0 NOT NULL,
	"minimum_alert_stock" integer DEFAULT 5 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"type" "inventory_transaction_type" NOT NULL,
	"quantity" integer NOT NULL,
	"previous_stock" integer NOT NULL,
	"resulting_stock" integer NOT NULL,
	"reason" text NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"actor_id" uuid,
	"actor_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reminder_number" text NOT NULL UNIQUE,
	"customer_id" uuid NOT NULL,
	"invoice_id" uuid,
	"payment_id" uuid,
	"reminder_type" "reminder_type" DEFAULT 'PAYMENT_FOLLOW_UP' NOT NULL,
	"reminder_date" timestamp with time zone NOT NULL,
	"reminder_time" text,
	"priority" "service_priority" DEFAULT 'NORMAL' NOT NULL,
	"status" "reminder_status" DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"completed_by" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"category" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_assets" ADD CONSTRAINT "customer_assets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_assets" ADD CONSTRAINT "customer_assets_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_assets" ADD CONSTRAINT "customer_assets_installation_address_id_customer_addresses_id_fk" FOREIGN KEY ("installation_address_id") REFERENCES "public"."customer_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_asset_id_customer_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."customer_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_events" ADD CONSTRAINT "warranty_events_warranty_id_warranties_id_fk" FOREIGN KEY ("warranty_id") REFERENCES "public"."warranties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_events" ADD CONSTRAINT "warranty_events_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_events" ADD CONSTRAINT "warranty_events_asset_id_customer_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."customer_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_events" ADD CONSTRAINT "warranty_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_events" ADD CONSTRAINT "warranty_events_replacement_asset_id_customer_assets_id_fk" FOREIGN KEY ("replacement_asset_id") REFERENCES "public"."customer_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_schedules" ADD CONSTRAINT "service_schedules_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_schedules" ADD CONSTRAINT "service_schedules_asset_id_customer_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."customer_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_schedules" ADD CONSTRAINT "service_schedules_warranty_id_warranties_id_fk" FOREIGN KEY ("warranty_id") REFERENCES "public"."warranties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_schedules" ADD CONSTRAINT "service_schedules_generated_service_id_services_id_fk" FOREIGN KEY ("generated_service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_asset_id_customer_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."customer_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_warranty_id_warranties_id_fk" FOREIGN KEY ("warranty_id") REFERENCES "public"."warranties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_asset_id_customer_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."customer_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_converted_customer_id_customers_id_fk" FOREIGN KEY ("converted_customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "customer_addresses_customer_id_idx" ON "customer_addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customers_customer_number_idx" ON "customers" USING btree ("customer_number");--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "customers_status_idx" ON "customers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "products_sku_idx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_type_idx" ON "products" USING btree ("product_type");--> statement-breakpoint
CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "products_is_active_idx" ON "products" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "customer_assets_customer_id_idx" ON "customer_assets" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_assets_product_id_idx" ON "customer_assets" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "customer_assets_serial_number_idx" ON "customer_assets" USING btree ("serial_number");--> statement-breakpoint
CREATE INDEX "customer_assets_status_idx" ON "customer_assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_items_product_id_idx" ON "sale_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "sales_sale_number_idx" ON "sales" USING btree ("sale_number");--> statement-breakpoint
CREATE INDEX "sales_customer_id_idx" ON "sales" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sales_date_idx" ON "sales" USING btree ("sale_date");--> statement-breakpoint
CREATE INDEX "sales_status_idx" ON "sales" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoices_invoice_number_idx" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "invoices_customer_id_idx" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "invoices_sale_id_idx" ON "invoices" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "invoices_due_date_idx" ON "invoices" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_payment_number_idx" ON "payments" USING btree ("payment_number");--> statement-breakpoint
CREATE INDEX "payments_customer_id_idx" ON "payments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "payments_invoice_id_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payments_date_idx" ON "payments" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "warranties_warranty_number_idx" ON "warranties" USING btree ("warranty_number");--> statement-breakpoint
CREATE INDEX "warranties_customer_id_idx" ON "warranties" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "warranties_asset_id_idx" ON "warranties" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "warranties_end_date_idx" ON "warranties" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "warranties_status_idx" ON "warranties" USING btree ("status");--> statement-breakpoint
CREATE INDEX "warranty_events_warranty_id_idx" ON "warranty_events" USING btree ("warranty_id");--> statement-breakpoint
CREATE INDEX "warranty_events_asset_id_idx" ON "warranty_events" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "warranty_events_type_idx" ON "warranty_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "service_schedules_customer_id_idx" ON "service_schedules" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "service_schedules_asset_id_idx" ON "service_schedules" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "service_schedules_planned_date_idx" ON "service_schedules" USING btree ("planned_date");--> statement-breakpoint
CREATE INDEX "service_schedules_status_idx" ON "service_schedules" USING btree ("status");--> statement-breakpoint
CREATE INDEX "services_service_number_idx" ON "services" USING btree ("service_number");--> statement-breakpoint
CREATE INDEX "services_customer_id_idx" ON "services" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "services_asset_id_idx" ON "services" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "services_technician_id_idx" ON "services" USING btree ("technician_id");--> statement-breakpoint
CREATE INDEX "services_scheduled_date_idx" ON "services" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "services_classification_idx" ON "services" USING btree ("service_classification");--> statement-breakpoint
CREATE INDEX "services_status_idx" ON "services" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_cards_job_card_number_idx" ON "job_cards" USING btree ("job_card_number");--> statement-breakpoint
CREATE INDEX "job_cards_service_id_idx" ON "job_cards" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "job_cards_customer_id_idx" ON "job_cards" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "job_cards_technician_id_idx" ON "job_cards" USING btree ("technician_id");--> statement-breakpoint
CREATE INDEX "job_cards_status_idx" ON "job_cards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "technicians_phone_idx" ON "technicians" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "technicians_status_idx" ON "technicians" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inquiries_inquiry_number_idx" ON "inquiries" USING btree ("inquiry_number");--> statement-breakpoint
CREATE INDEX "inquiries_phone_idx" ON "inquiries" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "inquiries_status_idx" ON "inquiries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inquiries_source_idx" ON "inquiries" USING btree ("source");--> statement-breakpoint
CREATE INDEX "inquiries_created_at_idx" ON "inquiries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_type_idx" ON "notifications" USING btree ("notification_type");--> statement-breakpoint
CREATE INDEX "customer_activities_customer_id_idx" ON "customer_activities" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_activities_event_type_idx" ON "customer_activities" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "customer_activities_timestamp_idx" ON "customer_activities" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_request_id_idx" ON "audit_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "documents_file_key_idx" ON "documents" USING btree ("file_key");--> statement-breakpoint
CREATE INDEX "documents_entity_idx" ON "documents" USING btree ("entity_type","entity_id");