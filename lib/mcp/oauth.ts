// claude.ai 커스텀 커넥터용 최소 OAuth 2.1 구현 (DCR + PKCE, 전부 무상태 JWT).
// - client_id: 등록된 redirect_uris를 담아 서명한 JWT → 별도 저장소 불필요
// - authorization code: 10분 만료 JWT (redirect_uri + PKCE challenge 바인딩)
// - access/refresh token: type 클레임으로 admin 세션 JWT와 완전히 분리
// 승인 단계는 기존 GitHub 관리자 로그인(admin_session)이 대신한다 — 관리자만 통과 가능.
import { createHash } from 'node:crypto'
import { jwtVerify, SignJWT } from 'jose'
import { getMcpOauthSecret } from '@/lib/secrets'

// 액세스 토큰에는 폐기 목록이 없다 — 짧게 잡고 리프레시가 수명을 맡는다
export const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24 // 1일
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30 // 30일
const CODE_MAX_AGE = 60 * 10 // 10분
export const CONSENT_MAX_AGE = 60 * 5 // 5분 — 동의 화면 체류 한도

// 오픈 리다이렉트 차단: code를 받을 수 있는 호스트 화이트리스트
// (승인이 관리자 세션으로 자동 통과되므로, 임의 redirect_uri 등록을 허용하면
//  공격자가 관리자에게 authorize 링크만 밟게 해도 토큰을 탈취할 수 있다)
const ALLOWED_REDIRECT_HOSTS = ['claude.ai', 'claude.com', 'anthropic.com']

// MCP 토큰의 유일한 폐기 수단이 키 로테이션이므로 admin 세션 키와 분리한다 (lib/secrets.ts)
function getSecret() {
  return new TextEncoder().encode(getMcpOauthSecret())
}

export function isAllowedRedirectUri(uri: string): boolean {
  let url: URL
  try {
    url = new URL(uri)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  const host = url.hostname
  return ALLOWED_REDIRECT_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
}

async function sign(payload: Record<string, unknown>, maxAgeSeconds: number | null) {
  const jwt = new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt()
  if (maxAgeSeconds) jwt.setExpirationTime(`${maxAgeSeconds}s`)
  return jwt.sign(getSecret())
}

async function verify(token: string, type: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.type !== type) return null
    return payload
  } catch {
    return null
  }
}

// ---------- 동적 클라이언트 등록 ----------

export async function signClientId(redirectUris: string[]): Promise<string> {
  return sign({ type: 'mcp_client', redirect_uris: redirectUris }, null)
}

export async function verifyClientId(clientId: string): Promise<string[] | null> {
  const payload = await verify(clientId, 'mcp_client')
  if (!payload || !Array.isArray(payload.redirect_uris)) return null
  return payload.redirect_uris.map(String)
}

// ---------- authorization code ----------

export interface AuthCodePayload {
  clientId: string
  redirectUri: string
  codeChallenge: string
}

export async function signAuthCode(data: AuthCodePayload): Promise<string> {
  return sign(
    {
      type: 'mcp_code',
      client_id: data.clientId,
      redirect_uri: data.redirectUri,
      code_challenge: data.codeChallenge,
    },
    CODE_MAX_AGE
  )
}

export async function verifyAuthCode(code: string): Promise<AuthCodePayload | null> {
  const payload = await verify(code, 'mcp_code')
  if (
    !payload ||
    typeof payload.client_id !== 'string' ||
    typeof payload.redirect_uri !== 'string' ||
    typeof payload.code_challenge !== 'string'
  ) {
    return null
  }
  return {
    clientId: payload.client_id,
    redirectUri: payload.redirect_uri,
    codeChallenge: payload.code_challenge,
  }
}

/** PKCE S256: base64url(sha256(verifier)) === challenge */
export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const digest = createHash('sha256').update(codeVerifier).digest('base64url')
  return digest === codeChallenge
}

// ---------- 동의 토큰 (authorize GET → 동의 화면 → POST 발급) ----------

export interface ConsentPayload extends AuthCodePayload {
  state: string | null
  /** 단일사용 소각용 (used_nonces) */
  jti: string
  /** ms epoch — 논스 만료 기록용 */
  expiresAtMs: number
}

export async function signConsentToken(
  data: AuthCodePayload & { state: string | null }
): Promise<string> {
  return sign(
    {
      type: 'mcp_consent',
      jti: crypto.randomUUID(),
      client_id: data.clientId,
      redirect_uri: data.redirectUri,
      code_challenge: data.codeChallenge,
      state: data.state,
    },
    CONSENT_MAX_AGE
  )
}

export async function verifyConsentToken(token: string): Promise<ConsentPayload | null> {
  const payload = await verify(token, 'mcp_consent')
  if (
    !payload ||
    typeof payload.jti !== 'string' ||
    typeof payload.client_id !== 'string' ||
    typeof payload.redirect_uri !== 'string' ||
    typeof payload.code_challenge !== 'string' ||
    typeof payload.exp !== 'number'
  ) {
    return null
  }
  return {
    clientId: payload.client_id,
    redirectUri: payload.redirect_uri,
    codeChallenge: payload.code_challenge,
    state: typeof payload.state === 'string' ? payload.state : null,
    jti: payload.jti,
    expiresAtMs: payload.exp * 1000,
  }
}

// ---------- access / refresh token ----------
// client_id 바인딩: 어느 등록 클라이언트에 발급됐는지 토큰이 스스로 말하게 한다.
// jti는 추적/향후 폐기 목록 대비용.

export async function signAccessToken(clientId: string): Promise<string> {
  return sign(
    { type: 'mcp_access', client_id: clientId, jti: crypto.randomUUID() },
    ACCESS_TOKEN_MAX_AGE
  )
}

export async function signRefreshToken(clientId: string): Promise<string> {
  return sign(
    { type: 'mcp_refresh', client_id: clientId, jti: crypto.randomUUID() },
    REFRESH_TOKEN_MAX_AGE
  )
}

export interface VerifiedToken {
  clientId: string
}

export async function verifyAccessToken(token: string): Promise<VerifiedToken | null> {
  const payload = await verify(token, 'mcp_access')
  // 과거 발급분(client_id 없음)은 만료로 자연 소멸 — 미상으로 허용하지 않는다
  if (!payload || typeof payload.client_id !== 'string') return null
  return { clientId: payload.client_id }
}

export async function verifyRefreshToken(token: string): Promise<VerifiedToken | null> {
  const payload = await verify(token, 'mcp_refresh')
  if (!payload || typeof payload.client_id !== 'string') return null
  return { clientId: payload.client_id }
}
