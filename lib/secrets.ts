// 서명/파생 시크릿 단일 접근점 — 용도별 분리로 로테이션 반경을 제한한다.
// 엣지(proxy.ts)에서도 import되므로 Node 전용 API를 쓰지 않는다 (env 읽기만).
//
// 도메인별 키와 로테이션 영향:
// - ADMIN_SESSION_SECRET (필수): admin 세션 + 댓글 user 세션 JWT + PoW 챌린지 파생키.
//   로테이션 = 전원 로그아웃 + 진행 중 챌린지 1회 실패(재시도로 회복). 영구 손실 없음.
// - MCP_OAUTH_SECRET (미설정 시 ADMIN_SESSION_SECRET 폴백): MCP OAuth의
//   client_id/code/access/refresh 토큰. 로테이션 = 커넥터 재인증 1회. 토큰 폐기 수단이
//   로테이션뿐이므로 반드시 별도 var로 설정해 admin 키와 독립적으로 돌릴 수 있게 한다.
// - ANON_IDENTITY_SECRET (미설정 시 ADMIN_SESSION_SECRET 폴백): 익명 댓글 신원 HMAC.
//   ⚠️ 파생 시드가 DB에 저장되어 수정/삭제 권한 판정에 쓰인다 — 이 키가 바뀌면 기존 익명
//   작성자 전원이 자기 댓글 권한을 영구히 잃는다. 최초 설정 시 반드시 **현재
//   ADMIN_SESSION_SECRET 값을 복사**해서 넣고, 이후 절대 로테이션하지 않는다.

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not set`)
  return value
}

export function getAdminSessionSecret(): string {
  return required('ADMIN_SESSION_SECRET', process.env.ADMIN_SESSION_SECRET)
}

export function getMcpOauthSecret(): string {
  return process.env.MCP_OAUTH_SECRET || getAdminSessionSecret()
}

export function getAnonIdentitySecret(): string {
  return process.env.ANON_IDENTITY_SECRET || getAdminSessionSecret()
}
