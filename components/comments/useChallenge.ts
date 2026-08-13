'use client'

// PoW 챌린지를 사용자 몰래 미리 풀어두는 훅.
//
// 핵심은 타이밍이다 — 폼이 화면에 나타나는 순간 계산을 시작하면, 사용자가 댓글을 다 쓸 때쯤에는
// 이미 끝나 있다. 서버가 요구하는 최소 체류 시간(3초)도 같은 사이에 자연히 채워진다.
// 그래서 제출 버튼을 눌렀을 때 기다리는 시간이 사실상 0이 된다.
import { useCallback, useEffect, useRef, useState } from 'react'

interface RawChallenge {
  salt: string
  difficulty: number
  issuedAt: number
  exp: number
  sig: string
}

export interface SolvedChallenge extends RawChallenge {
  nonce: string
}

export type ChallengeState = 'idle' | 'working' | 'ready' | 'error'

function hasLeadingZeroBits(digest: Uint8Array, bits: number): boolean {
  const fullBytes = bits >> 3
  for (let i = 0; i < fullBytes; i++) {
    if (digest[i] !== 0) return false
  }
  const remainder = bits & 7
  if (remainder === 0) return true
  return digest[fullBytes] >> (8 - remainder) === 0
}

/**
 * 여기서 setTimeout으로 메인 스레드를 놓아주면 안 된다.
 * 백그라운드 탭에서 브라우저가 setTimeout을 1초로 스로틀하기 때문에, 양보 33번이 그대로
 * 33초가 된다(실측 28초). `await crypto.subtle.digest`가 이미 매 회 이벤트 루프를 거치므로
 * 추가 양보 없이도 UI가 멈추지 않는다 — 16비트 탐색이 실측 0.24초다.
 */
async function solve(
  salt: string,
  difficulty: number,
  isCancelled: () => boolean
): Promise<string | null> {
  const encoder = new TextEncoder()
  for (let nonce = 0; ; nonce++) {
    const digest = new Uint8Array(
      await crypto.subtle.digest('SHA-256', encoder.encode(`${salt}:${nonce}`))
    )
    if (hasLeadingZeroBits(digest, difficulty)) return String(nonce)

    // 취소만 주기적으로 확인한다 (언마운트되거나 새 챌린지로 교체된 경우)
    if (nonce % 2000 === 1999 && isCancelled()) return null
  }
}

/**
 * 마운트되면 곧바로 챌린지를 받아 풀기 시작한다.
 * `consume()`은 풀린 챌린지를 넘겨주고 즉시 다음 것을 준비한다 — 챌린지는 1회용이라
 * 연속으로 댓글을 달거나 답글을 이어 쓸 때 두 번째부터 기다리지 않게 한다.
 */
export function useChallenge() {
  const [state, setState] = useState<ChallengeState>('idle')
  const solvedRef = useRef<SolvedChallenge | null>(null)
  const cancelledRef = useRef(false)
  const runIdRef = useRef(0)

  const prepare = useCallback(async () => {
    const runId = ++runIdRef.current
    solvedRef.current = null
    setState('working')

    try {
      const response = await fetch('/api/comments/challenge')
      if (!response.ok) throw new Error('challenge request failed')
      const challenge = (await response.json()) as RawChallenge

      const nonce = await solve(
        challenge.salt,
        challenge.difficulty,
        () => cancelledRef.current || runIdRef.current !== runId
      )
      if (nonce === null || runIdRef.current !== runId) return

      solvedRef.current = { ...challenge, nonce }
      setState('ready')
    } catch {
      if (runIdRef.current === runId) setState('error')
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    prepare()
    return () => {
      cancelledRef.current = true
    }
  }, [prepare])

  const consume = useCallback((): SolvedChallenge | null => {
    const solved = solvedRef.current
    solvedRef.current = null
    if (solved) {
      // 다음 제출을 위해 곧바로 새 챌린지를 준비한다
      prepare()
    }
    return solved
  }, [prepare])

  return { state, consume, retry: prepare }
}
