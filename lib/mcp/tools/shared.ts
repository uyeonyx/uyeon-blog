import type { createMcpHandler } from 'mcp-handler'

// mcp-handler가 McpServer 타입을 직접 export하지 않으므로 초기화 콜백에서 유도
type InitFn = Parameters<typeof createMcpHandler>[0]
export type McpServer = InitFn extends (server: infer S) => unknown ? S : never

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** 도구 응답: JSON 데이터 */
export function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
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
].join('\n')
