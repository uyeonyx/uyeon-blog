CREATE TABLE "used_nonces" (
	"nonce" text PRIMARY KEY NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "sanitizer_version" integer DEFAULT 1 NOT NULL;