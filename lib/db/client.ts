import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

let _db: ReturnType<typeof createDb> | null = null

function createDb() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }
  return drizzle(neon(url), { schema })
}

// 빌드 타임 import에서 env 부재로 죽지 않도록 지연 초기화
export function getDb() {
  if (!_db) {
    _db = createDb()
  }
  return _db
}
