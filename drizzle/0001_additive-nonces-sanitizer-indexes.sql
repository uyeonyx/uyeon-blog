CREATE TABLE "used_nonces" (
	"nonce" text PRIMARY KEY NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "sanitizer_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_comments_parent" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_posts_tags_gin" ON "posts" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "idx_projects_tags_gin" ON "projects" USING gin ("tags");