ALTER TABLE "cognitive_object_approvals" DROP CONSTRAINT "cognitive_object_approvals_object_id_cognitive_objects_id_fk";
--> statement-breakpoint
ALTER TABLE "cognitive_object_loop_runs" DROP CONSTRAINT "cognitive_object_loop_runs_object_id_cognitive_objects_id_fk";
--> statement-breakpoint
ALTER TABLE "cognitive_object_outcomes" DROP CONSTRAINT "cognitive_object_outcomes_object_id_cognitive_objects_id_fk";
--> statement-breakpoint
ALTER TABLE "cognitive_object_relationships" DROP CONSTRAINT "cognitive_object_relationships_from_object_id_cognitive_objects_id_fk";
--> statement-breakpoint
ALTER TABLE "cognitive_object_relationships" DROP CONSTRAINT "cognitive_object_relationships_to_object_id_cognitive_objects_id_fk";
--> statement-breakpoint
DROP INDEX "cognitive_objects_tenant_id_idx";--> statement-breakpoint
ALTER TABLE "cognitive_object_approvals" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "cognitive_object_approvals" ADD CONSTRAINT "cognitive_object_approvals_object_id_cognitive_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."cognitive_objects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognitive_object_loop_runs" ADD CONSTRAINT "cognitive_object_loop_runs_object_id_cognitive_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."cognitive_objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognitive_object_outcomes" ADD CONSTRAINT "cognitive_object_outcomes_object_id_cognitive_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."cognitive_objects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognitive_object_relationships" ADD CONSTRAINT "cognitive_object_relationships_from_object_id_cognitive_objects_id_fk" FOREIGN KEY ("from_object_id") REFERENCES "public"."cognitive_objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognitive_object_relationships" ADD CONSTRAINT "cognitive_object_relationships_to_object_id_cognitive_objects_id_fk" FOREIGN KEY ("to_object_id") REFERENCES "public"."cognitive_objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cognitive_object_relationships_unique_edge_idx" ON "cognitive_object_relationships" USING btree ("tenant_id","from_object_id","to_object_id","relationship_type");--> statement-breakpoint
CREATE INDEX "cognitive_objects_tenant_created_idx" ON "cognitive_objects" USING btree ("tenant_id","created_at");--> statement-breakpoint
ALTER TABLE "cognitive_object_loop_runs" ADD CONSTRAINT "cognitive_object_loop_runs_confidence_score_range" CHECK ("cognitive_object_loop_runs"."confidence_score" IS NULL OR ("cognitive_object_loop_runs"."confidence_score" >= 0 AND "cognitive_object_loop_runs"."confidence_score" <= 100));--> statement-breakpoint
ALTER TABLE "cognitive_object_loop_runs" ADD CONSTRAINT "cognitive_object_loop_runs_release_score_range" CHECK ("cognitive_object_loop_runs"."release_score" IS NULL OR ("cognitive_object_loop_runs"."release_score" >= 0 AND "cognitive_object_loop_runs"."release_score" <= 100));--> statement-breakpoint
ALTER TABLE "cognitive_object_outcomes" ADD CONSTRAINT "cognitive_object_outcomes_success_score_range" CHECK ("cognitive_object_outcomes"."success_score" IS NULL OR ("cognitive_object_outcomes"."success_score" >= 0 AND "cognitive_object_outcomes"."success_score" <= 100));--> statement-breakpoint
ALTER TABLE "cognitive_object_relationships" ADD CONSTRAINT "cognitive_object_relationships_strength_range" CHECK ("cognitive_object_relationships"."strength" >= 0 AND "cognitive_object_relationships"."strength" <= 100);--> statement-breakpoint
ALTER TABLE "cognitive_object_relationships" ADD CONSTRAINT "cognitive_object_relationships_no_self_edge" CHECK ("cognitive_object_relationships"."from_object_id" <> "cognitive_object_relationships"."to_object_id");--> statement-breakpoint
ALTER TABLE "cognitive_objects" ADD CONSTRAINT "cognitive_objects_confidence_score_range" CHECK ("cognitive_objects"."confidence_score" IS NULL OR ("cognitive_objects"."confidence_score" >= 0 AND "cognitive_objects"."confidence_score" <= 100));