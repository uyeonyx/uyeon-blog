import type { createMcpHandler } from 'mcp-handler'

// mcp-handler가 McpServer 타입을 직접 export하지 않으므로 초기화 콜백에서 유도
type InitFn = Parameters<typeof createMcpHandler>[0]
export type McpServer = InitFn extends (server: infer S) => unknown ? S : never

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** 도구 응답: JSON 데이터 (들여쓰기 없음 — 모델 컨텍스트로 그대로 들어가는 텍스트다) */
export function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
}

/**
 * 키 순서에 무관한 JSON 직렬화. Postgres jsonb는 키 순서를 보존하지 않으므로,
 * 저장된 Tiptap 문서와 새로 파싱한 문서를 비교하려면 정준화가 필요하다.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value ?? null, (_key, val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.fromEntries(
          Object.keys(val as Record<string, unknown>)
            .sort()
            .map((k) => [k, (val as Record<string, unknown>)[k]])
        )
      : val
  )
}

/** 본문이 실질적으로 같은가 — 같으면 MDX 재컴파일(언어당 수 초)을 건너뛴다 */
export function sameContent(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b)
}

/** 도구 응답: 에러 */
export function err(message: string, extra?: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: message, ...extra }) }],
    isError: true as const,
  }
}

/** 본문 마크다운 규약 — 도구 description에 포함해 에이전트가 올바른 문법을 쓰게 유도 */
export const MARKDOWN_GUIDE = [
  '본문 마크다운 규약:',
  '- 이미지: 치수를 알면 `<Image alt="…" src="…" width={W} height={H} />` (JSX 그대로 유지), 아니면 `![alt](url)`',
  '- 유튜브: `<YouTube id="영상ID" />`',
  '- 밑줄: `<u>텍스트</u>`, 알림: `> [!NOTE|TIP|IMPORTANT|WARNING|CAUTION]`',
  '- 코드 블록 제목: ```언어:제목, GFM 표(셀 내 줄바꿈은 `<br />`)',
  '- 수식: 인라인 `$$…$$`, 블록은 `$$`만 있는 줄로 감싼다. 홑달러(`$…$`)는 수식이 아니라 일반 텍스트이므로 통화 표기($1 billion 등)는 그대로 쓰면 된다.',
  '- 그 외 임의 JSX/HTML/import는 지원되지 않으며 경고와 함께 유실될 수 있다.',
  '저장된 본문은 정규화된 형태로 보관되므로 이후 조회 결과가 보낸 마크다운과 문자 단위로 다를 수 있다 — 정상이며 다시 고칠 필요가 없다.',
].join('\n')
