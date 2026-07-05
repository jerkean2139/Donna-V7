CREATE TABLE "feedback_widget_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(191) NOT NULL,
	"public_key" varchar(64) NOT NULL,
	"label" varchar(120) NOT NULL,
	"allowed_origins" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_user_id" varchar(191) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_widget_keys_public_key_idx" ON "feedback_widget_keys" USING btree ("public_key");--> statement-breakpoint
CREATE INDEX "feedback_widget_keys_tenant_idx" ON "feedback_widget_keys" USING btree ("tenant_id");