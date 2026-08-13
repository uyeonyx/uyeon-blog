// admin 클라이언트 공용 fetch — 절대 던지지 않는다.
// 기존 코드는 catch 없는 `await res.json()`이라 네트워크 단절·502·비JSON 응답이
// unhandled rejection으로 사라졌다(특히 자동저장은 실패해도 성공과 구분 불가).
// 댓글 쪽 CommentForm의 방어 패턴을 admin 전체의 규약으로 승격한 것.

export type AdminFetchResult<T> =
  | { ok: true; data: T }
  /** status 0 = 네트워크 단계 실패. body는 파싱된 에러 응답(있다면) — problems 등 부가 필드용 */
  | { ok: false; error: string; status: number; body: Record<string, unknown> | null }

export async function adminFetch<T = unknown>(
  input: string,
  init?: RequestInit
): Promise<AdminFetchResult<T>> {
  let response: Response
  try {
    response = await fetch(input, init)
  } catch {
    return { ok: false, error: '네트워크 오류 — 연결을 확인해 주세요', status: 0, body: null }
  }

  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null

  if (!response.ok) {
    return {
      ok: false,
      error: typeof data?.error === 'string' ? data.error : `요청 실패 (HTTP ${response.status})`,
      status: response.status,
      body: data,
    }
  }
  if (data === null) {
    return { ok: false, error: '응답을 해석할 수 없습니다', status: response.status, body: null }
  }
  return { ok: true, data: data as T }
}
