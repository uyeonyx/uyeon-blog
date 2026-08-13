// 댓글 수정·삭제 권한 판정 한 곳.
//
// 목록(GET)은 요청자 하나로 여러 행을 판정하고, 수정·삭제(PATCH/DELETE)는 행 하나를 판정한다.
// 두 경로가 어긋나면 버튼은 보이는데 API가 거부하는(혹은 그 반대의) 상태가 되므로 규칙을 공유한다.
//
// 익명 판정은 anon_id 쿠키에서 파생한 시드를 댓글에 저장된 시드와 맞춰 본다. 서버가 쿠키로
// 직접 판정하므로 목록 응답의 canEdit·canDelete가 익명에게도 정확하다 — 클라이언트가 따로
// 보정할 것이 없다. 남의 시드를 흉내내려면 그 시드를 내놓는 anon_id를 찾아야 하는데,
// 서명 키 없이는 HMAC을 계산할 수조차 없다.
import { getAdminSession } from '@/lib/admin/session'
import { getUserSession, type UserSession } from '@/lib/auth/user-session'
import type { CommentListRow } from '@/lib/db/comments'
import { readAnonSeed } from './anon-identity'

export interface CommentActor {
  session: UserSession | null
  isAdmin: boolean
  /** 이 브라우저의 익명 신원 — 쿠키가 없으면 null */
  anonSeed: string | null
}

export async function loadCommentActor(): Promise<CommentActor> {
  const [session, adminSession, anonSeed] = await Promise.all([
    getUserSession(),
    getAdminSession(),
    readAnonSeed(),
  ])
  return { session, isAdmin: !!adminSession, anonSeed }
}

/** 로그인 작성자 본인인지 — login은 바뀔 수 있으므로 provider의 불변 id로만 비교한다 */
function isSameUser(row: CommentListRow, session: UserSession | null): boolean {
  if (!session || row.authorType !== 'user') return false
  return row.provider === session.provider && row.providerUserId === session.providerUserId
}

/**
 * 같은 브라우저에서 쓴 익명 댓글인지.
 * 시드가 없는 행(이 신원 체계 이전에 달린 익명 댓글)은 아무와도 일치하지 않아야 하므로
 * 양쪽이 모두 있을 때만 비교한다 — null === null로 전원 통과하는 사고를 막는다.
 */
function isSameAnon(row: CommentListRow, anonSeed: string | null): boolean {
  if (row.authorType !== 'anonymous') return false
  if (!row.anonAvatarSeed || !anonSeed) return false
  return row.anonAvatarSeed === anonSeed
}

/**
 * 수정 권한. 관리자라도 남의 댓글 본문은 고칠 수 없다 — 남의 이름 아래 글자를 바꾸는 것은
 * 사칭이 된다. 관리자에게는 숨김(setCommentStatus)과 삭제가 있고, 그것으로 충분하다.
 */
export function canEditComment(row: CommentListRow, actor: CommentActor): boolean {
  if (row.status !== 'visible') return false
  if (row.authorType === 'anonymous') return isSameAnon(row, actor.anonSeed)
  return isSameUser(row, actor.session)
}

/** 삭제 권한. 모더레이션이 필요하므로 관리자는 무엇이든 지울 수 있다. */
export function canDeleteComment(row: CommentListRow, actor: CommentActor): boolean {
  if (row.status === 'deleted') return false
  if (actor.isAdmin) return true
  if (row.authorType === 'anonymous') return isSameAnon(row, actor.anonSeed)
  return isSameUser(row, actor.session)
}
