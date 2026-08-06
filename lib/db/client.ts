import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

let _db: ReturnType<typeof createDb> | null = null

function createDb() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }
  // 서버리스 함수 인스턴스당 소수의 커넥션만 유지
  const pool = new Pool({ connectionString: url, max: 3 })
  return drizzle(pool, { schema })
}

// 빌드 타임 import에서 env 부재로 죽지 않도록 지연 초기화
export function getDb() {
  if (!_db) {
    _db = createDb()
  }
  return _db
}
