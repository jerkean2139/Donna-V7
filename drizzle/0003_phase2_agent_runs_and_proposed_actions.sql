CREATE TYPE "public"."agent_run_status" AS ENUM('completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."proposed_action_status" AS ENUM('proposed', 'approved', 'rejected', 'executed', 'failed');--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(191) NOT NULL,
	"object_id" uuid NOT NULL,
	"agent_name" varchar(120) NOT NULL,
	"task" text NOT NULL,
	"status" "agent_run_status" NOT NULL,
	"response_text" text,
	"tool_calls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"delegation_request" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposed_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(191) NOT NULL,
	"agent_run_id" uuid NOT NULL,
	"object_id" uuid NOT NULL,
	"tool_name" varchar(120) NOT NULL,
	"args" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"description" text NOT NULL,
	"effective_risk_level" "risk_level" NOT NULL,
	"reversible" boolean NOT NULL,
	"status" "proposed_action_status" DEFAULT 'proposed' NOT NULL,
	"approval_required" boolean NOT NULL,
	"approval_reason" text,
	"decided_by_user_id" varchar(191),
	"decided_at" timestamp with time zone,
	"result_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_object_id_cognitive_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."cognitive_objects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposed_actions" ADD CONSTRAINT "proposed_actions_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposed_actions" ADD CONSTRAINT "proposed_actions_object_id_cognitive_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."cognitive_objects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_runs_tenant_object_idx" ON "agent_runs" USING btree ("tenant_id","object_id");--> statement-breakpoint
CREATE INDEX "proposed_actions_tenant_object_idx" ON "proposed_actions" USING btree ("tenant_id","object_id");--> statement-breakpoint
CREATE INDEX "proposed_actions_tenant_run_idx" ON "proposed_actions" USING btree ("tenant_id","agent_run_id");--> statement-breakpoint
CREATE INDEX "proposed_actions_tenant_status_idx" ON "proposed_actions" USING btree ("tenant_id","status");