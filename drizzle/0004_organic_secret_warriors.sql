CREATE TYPE "public"."integration_provider" AS ENUM('ghl', 'resend');--> statement-breakpoint
CREATE TABLE "tenant_integration_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(191) NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"encrypted_value" text NOT NULL,
	"created_by_user_id" varchar(191) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_integration_credentials_tenant_provider_idx" ON "tenant_integration_credentials" USING btree ("tenant_id","provider");