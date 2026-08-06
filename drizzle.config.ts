import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Next.js와 동일하게 .env.local을 우선 로드 (dotenv/config는 .env만 읽는다)
config({ path: '.env.local' })
config()

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // biome-ignore lint/style/noNonNullAssertion: drizzle-kit 실행 시에만 필요
    url: process.env.DATABASE_URL!,
  },
})
