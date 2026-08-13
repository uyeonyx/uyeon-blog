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
  const pool = new Pool({
    connectionString: url,
    max: 3,
    connectionTimeoutMillis: 10_000, // 기본값 0 = 무한 대기 — 프록시 장애 시 빠르게 실패
    idleTimeoutMillis: 30_000, // Railway TCP 프록시가 유휴 커넥션을 끊기 전에 먼저 회수
    keepAlive: true,
    allowExitOnIdle: true,
    // Railway Postgres는 자체서명 인증서 — sslmode=require를 URL에 넣으면 pg가 CA 검증에서 거부한다
    ssl: process.env.DATABASE_SSL === 'require' ? { rejectUnauthorized: false } : undefined,
  })
  // 유휴 클라이언트 에러는 리스너가 없으면 uncaught exception으로 프로세스를 죽인다
  pool.on('error', (err) => {
    console.error('[db] idle client error', err)
  })
  return drizzle(pool, { schema })
}

// 빌드 타임 import에서 env 부재로 죽지 않도록 지연 초기화
export function getDb() {
  if (!_db) {
    _db = createDb()
  }
  return _db
}
