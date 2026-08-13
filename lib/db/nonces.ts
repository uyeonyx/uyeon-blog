// 1회용 논스 소모 — PoW salt(댓글)와 OAuth 동의 jti가 공용한다.
import { lt } from 'drizzle-orm'
import { getDb } from './client'
import { usedNonces } from './schema'

export type NoncePurpose = 'pow' | 'oauth_consent'

/**
 * 논스를 소모한다. true = 최초 사용, false = 이미 사용됨(재사용 시도).
 * INSERT가 진짜 단일사용 지점 — 검증(서명/PoW)을 통과한 뒤에만 호출할 것.
 * 실패한 제출이 남의 salt를 소모하면 정상 사용자가 막힌다.
 */
export async function consumeNonce(
  nonce: string,
  purpose: NoncePurpose,
  expiresAt: Date
): Promise<boolean> {
  const db = getDb()
  const inserted = await db
    .insert(usedNonces)
    .values({ nonce, purpose, expiresAt })
    .onConflictDoNothing()
    .returning({ nonce: usedNonces.nonce })

  // 트래픽이 작으니 소모 시점에 만료행을 기회적으로 청소한다 (별도 크론 불필요)
  db.delete(usedNonces)
    .where(lt(usedNonces.expiresAt, new Date()))
    .catch(() => {})

  return inserted.length > 0
}
