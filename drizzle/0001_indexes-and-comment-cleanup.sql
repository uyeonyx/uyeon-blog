CREATE INDEX "idx_comments_parent" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_posts_tags_gin" ON "posts" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "idx_projects_tags_gin" ON "projects" USING gin ("tags");--> statement-breakpoint
ALTER TABLE "comments" DROP COLUMN "notify_email";--> statement-breakpoint
ALTER TABLE "comments" DROP COLUMN "notify_token";