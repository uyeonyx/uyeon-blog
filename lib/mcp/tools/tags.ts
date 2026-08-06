// MCP 태그 도구 — admin API와 동일한 tag-service를 재사용한다.
import { listTagUsage } from '@/lib/admin/tag-service'
import { type McpServer, ok } from './shared'

export function registerTagTools(server: McpServer) {
  server.registerTool(
    'tags_list',
    {
      title: '태그 목록',
      description: [
        '태그 마스터 목록을 조회한다 (slug, 한/영 라벨, 사용 글/프로젝트 수).',
        '글이나 프로젝트에 태그를 달기 전에 반드시 먼저 호출해 기존 태그를 재사용할 것.',
        '새 태그는 저장 시 자동 등록되지만, 유사한 태그가 이미 있으면 그 slug를 그대로 쓰는 것이 좋다 (예: "AI" 대신 기존 "generative-ai").',
      ].join('\n'),
      inputSchema: {},
    },
    async () => ok({ items: await listTagUsage() })
  )
}
