CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
CREATE TYPE "public"."cognitive_object_source" AS ENUM('manual', 'chat', 'upload', 'email', 'meeting', 'api', 'system');--> statement-breakpoint
CREATE TYPE "public"."cognitive_object_status" AS ENUM('draft', 'active', 'analyzing', 'approval_required', 'approved', 'executed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."cognitive_object_type" AS ENUM('decision', 'research', 'meeting', 'proposal', 'issue', 'lesson', 'memory');--> statement-breakpoint
CREATE TYPE "public"."relationship_source" AS ENUM('human', 'system_rule', 'ai_inferred', 'integration_metadata', 'import_process');--> statement-breakpoint
CREATE TYPE "public"."relationship_type" AS ENUM('supports', 'contradicts', 'caused_by', 'resulted_in', 'references', 'supersedes', 'duplicates', 'depends_on');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TABLE "cognitive_object_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(191) NOT NULL,
	"object_id" uuid NOT NULL,
	"approval_status" varchar(50) DEFAULT 'requested' NOT NULL,
	"approval_reason" text,
	"requested_by_user_id" varchar(191),
	"approved_by_user_id" varchar(191),
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "cognitive_object_loop_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(191) NOT NULL,
	"object_id" uuid NOT NULL,
	"loop_version" varchar(50) NOT NULL,
	"intent_summary" text,
	"hidden_goal" text,
	"context_summary" text,
	"assumptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"options_considered" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"critique" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommendation" text,
	"confidence_score" integer,
	"release_score" integer,
	"release_score_breakdown" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approval_required" boolean DEFAULT false NOT NULL,
	"approval_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cognitive_object_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(191) NOT NULL,
	"object_id" uuid NOT NULL,
	"outcome_summary" text NOT NULL,
	"success_score" integer,
	"lesson_learned" text,
	"follow_up_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cognitive_object_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(191) NOT NULL,
	"from_object_id" uuid NOT NULL,
	"to_object_id" uuid NOT NULL,
	"relationship_type" "relationship_type" NOT NULL,
	"strength" integer DEFAULT 60 NOT NULL,
	"source" "relationship_source" NOT NULL,
	"created_by_user_id" varchar(191),
	"created_by_agent_id" varchar(191),
	"evidence_summary" text,
	"confirmed_by_user_id" varchar(191),
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cognitive_objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(191) NOT NULL,
	"project_id" uuid,
	"created_by_user_id" varchar(191) NOT NULL,
	"object_type" "cognitive_object_type" NOT NULL,
	"title" varchar(180) NOT NULL,
	"summary" text,
	"body" text,
	"status" "cognitive_object_status" DEFAULT 'draft' NOT NULL,
	"source" "cognitive_object_source" DEFAULT 'manual' NOT NULL,
	"risk_level" "risk_level" DEFAULT 'low' NOT NULL,
	"confidence_score" integer,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cognitive_object_approvals" ADD CONSTRAINT "cognitive_object_approvals_object_id_cognitive_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."cognitive_objects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognitive_object_loop_runs" ADD CONSTRAINT "cognitive_object_loop_runs_object_id_cognitive_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."cognitive_objects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognitive_object_outcomes" ADD CONSTRAINT "cognitive_object_outcomes_object_id_cognitive_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."cognitive_objects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognitive_object_relationships" ADD CONSTRAINT "cognitive_object_relationships_from_object_id_cognitive_objects_id_fk" FOREIGN KEY ("from_object_id") REFERENCES "public"."cognitive_objects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognitive_object_relationships" ADD CONSTRAINT "cognitive_object_relationships_to_object_id_cognitive_objects_id_fk" FOREIGN KEY ("to_object_id") REFERENCES "public"."cognitive_objects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cognitive_object_approvals_tenant_object_idx" ON "cognitive_object_approvals" USING btree ("tenant_id","object_id");--> statement-breakpoint
CREATE INDEX "cognitive_object_loop_runs_tenant_object_idx" ON "cognitive_object_loop_runs" USING btree ("tenant_id","object_id");--> statement-breakpoint
CREATE INDEX "cognitive_object_outcomes_tenant_object_idx" ON "cognitive_object_outcomes" USING btree ("tenant_id","object_id");--> statement-breakpoint
CREATE INDEX "cognitive_object_relationships_tenant_from_idx" ON "cognitive_object_relationships" USING btree ("tenant_id","from_object_id");--> statement-breakpoint
CREATE INDEX "cognitive_object_relationships_tenant_to_idx" ON "cognitive_object_relationships" USING btree ("tenant_id","to_object_id");--> statement-breakpoint
CREATE INDEX "cognitive_objects_tenant_id_idx" ON "cognitive_objects" USING btree ("tenant_id");
