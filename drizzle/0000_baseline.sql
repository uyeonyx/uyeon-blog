CREATE TYPE "public"."comment_author_type" AS ENUM('user', 'anonymous');--> statement-breakpoint
CREATE TYPE "public"."comment_status" AS ENUM('visible', 'pending', 'hidden', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('draft', 'published', 'private', 'archived');--> statement-breakpoint
CREATE TABLE "author_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"language" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"occupation" text,
	"company" text,
	"tech_stack" jsonb,
	"timeline" jsonb,
	"content_json" jsonb,
	"content_md" text DEFAULT '' NOT NULL,
	"compiled_code" text,
	"compiled_at" timestamp with time zone,
	CONSTRAINT "uq_author_translations_author_language" UNIQUE("author_id","language"),
	CONSTRAINT "ck_author_translations_language" CHECK ("author_translations"."language" IN ('ko','en'))
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"avatar_url" text,
	"email" text,
	"github" text,
	"linkedin" text,
	"twitter" text,
	"bluesky" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"parent_id" uuid,
	"author_type" "comment_author_type" DEFAULT 'user' NOT NULL,
	"provider" text,
	"provider_user_id" text,
	"author_name" text NOT NULL,
	"author_avatar_url" text,
	"author_url" text,
	"body_md" text NOT NULL,
	"body_html" text NOT NULL,
	"locale" text,
	"status" "comment_status" DEFAULT 'visible' NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"anon_avatar_seed" text,
	"notify_email" text,
	"notify_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "post_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"language" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"summary" text,
	"content_json" jsonb,
	"content_md" text DEFAULT '' NOT NULL,
	"compiled_code" text,
	"toc" jsonb,
	"reading_time" jsonb,
	"compiled_at" timestamp with time zone,
	CONSTRAINT "uq_post_translations_post_language" UNIQUE("post_id","language"),
	CONSTRAINT "ck_post_translations_language" CHECK ("post_translations"."language" IN ('ko','en'))
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"status" "post_status" DEFAULT 'draft' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"layout" text,
	"images" jsonb,
	"date" timestamp with time zone,
	"lastmod" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "project_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"language" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"period" text,
	"role" text,
	"company" text,
	"content_json" jsonb,
	"content_md" text DEFAULT '' NOT NULL,
	"compiled_code" text,
	"compiled_at" timestamp with time zone,
	CONSTRAINT "uq_project_translations_project_language" UNIQUE("project_id","language"),
	CONSTRAINT "ck_project_translations_language" CHECK ("project_translations"."language" IN ('ko','en'))
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"img_src" text,
	"href" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"slug" text PRIMARY KEY NOT NULL,
	"label_ko" text NOT NULL,
	"label_en" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "author_translations" ADD CONSTRAINT "author_translations_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_translations" ADD CONSTRAINT "post_translations_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_translations" ADD CONSTRAINT "project_translations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_comments_post_created" ON "comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_posts_status_date" ON "posts" USING btree ("status","date");--> statement-breakpoint
CREATE INDEX "idx_projects_order" ON "projects" USING btree ("published","display_order");