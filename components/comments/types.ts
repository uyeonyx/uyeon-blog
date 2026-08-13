// 클라이언트가 쓰는 댓글 타입. lib/db/comments.ts에서 가져오면 drizzle이 클라이언트 번들로
// 끌려오므로 모양만 따로 둔다 (서버 쪽 PublicComment와 필드가 일치해야 한다).
export interface PublicComment {
  id: string
  parentId: string | null
  authorType: 'user' | 'anonymous'
  authorName: string
  authorAvatarUrl: string | null
  anonAvatarSeed: string | null
  authorUrl: string | null
  bodyHtml: string
  locale: string | null
  isOwner: boolean
  isDeleted: boolean
  createdAt: string
  editedAt: string | null
  canDelete: boolean
  canEdit: boolean
  replies?: PublicComment[]
}

export interface CommentsResponse {
  items: PublicComment[]
  viewer: { name: string; avatarUrl: string | null; login: string } | null
  anonymousAllowed: boolean
}
