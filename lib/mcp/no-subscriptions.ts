// `subscriptions/listen`(MCP 2026-07-28) 차단.
//
// 왜: listen 스트림은 keepalive만 흘리며 maxDuration까지 열려 있고, Vercel Fluid는
// 요청이 in-flight인 동안 Provisioned Memory를 계속 청구한다(대기 중에도. Active CPU만 멈춘다).
// Hobby는 2GB 고정이라 스트림 하나가 시간당 2GB-Hr를 태운다 — 커넥터를 붙여둔 사용자
// 한 명이면 무료 한도 360GB-Hr의 4배가 나온다.
//
// 이 서버의 도구 목록은 코드에 고정되어 있어 런타임에 바뀌지 않으므로, 구독으로 얻을 것이
// 애초에 없다. 라우트가 `capabilities.tools.listChanged: false`로 광고를 끄면 정상
// 클라이언트는 구독을 시도하지 않지만, 광고와 무관하게 요청은 여전히 가능하다 —
// 실제 방어선은 이 가드다.
//
// mcp-handler 2.1.0은 SDK의 `maxSubscriptions` 옵션을 노출하지 않아 핸들러 위임 전에
// 직접 걷어내야 한다. 응답은 SDK가 구독 한도 초과에 쓰는 것과 같은 모양이라
// (-32603 'Subscription limit reached', HTTP 200 in-band) 클라이언트는 기존 경로로 처리한다.

const LISTEN_METHOD = 'subscriptions/listen'

interface JsonRpcish {
  method?: unknown
  id?: unknown
}

const isListen = (msg: unknown): msg is JsonRpcish =>
  typeof msg === 'object' && msg !== null && (msg as JsonRpcish).method === LISTEN_METHOD

/** JSON-RPC id는 string | number | null. 그 외에는 null로 떨어뜨린다. */
function responseId(msg: JsonRpcish): string | number | null {
  const { id } = msg
  return typeof id === 'string' || typeof id === 'number' ? id : null
}

/**
 * listen 요청이면 거부 응답을, 아니면 null을 돌려준다.
 *
 * 본문은 clone()으로 읽으므로 원본 Request는 그대로 핸들러에 넘길 수 있다
 * (mcp-handler도 같은 방식으로 한 번 더 clone한다).
 */
export async function rejectSubscriptions(request: Request): Promise<Response | null> {
  if (request.method !== 'POST') return null
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) return null

  // 파싱 실패는 우리 문제가 아니다 — 핸들러가 규격에 맞는 에러를 내도록 통과시킨다.
  const body = await request
    .clone()
    .json()
    .catch(() => null)

  // 배치 요청도 온다. 하나라도 listen이면 배치 전체를 거부한다 —
  // 부분 수락은 결국 스트림을 열어주는 것이라 의미가 없다.
  const listen = Array.isArray(body) ? body.find(isListen) : isListen(body) ? body : undefined
  if (!listen) return null

  return Response.json(
    {
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Subscription limit reached' },
      id: responseId(listen),
    },
    { status: 200 }
  )
}
