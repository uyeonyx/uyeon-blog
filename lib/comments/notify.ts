// 새 댓글 알림 — 블로그 주인의 디스코드 알림 채널로 웹훅을 쏜다.
// 봇 토큰도, 서버 공유 조건도 없다. URL 하나면 되고 라이브러리도 필요 없다.
//
// 제3자(댓글 작성자)에게 답글 알림을 보내려면 수신 동의·수신거부·반송 처리가 따라붙으므로
// 지금은 범위 밖이다.
import siteMetadata from '@/data/siteMetadata'
import type { CommentRow } from '@/lib/db/schema'

interface NotifyInput {
  comment: CommentRow
  postSlug: string
}

/** 디스코드 embed description 상한은 4096자지만 알림은 짧을수록 읽기 좋다 */
function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value
}

export async function notifyNewComment({ comment, postSlug }: NotifyInput): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL

  // 로컬 개발이나 미설정 상태에서는 조용히 건너뛴다 — 알림이 없다고 댓글이 막히면 안 된다
  if (!webhookUrl) return

  const author =
    comment.authorType === 'anonymous' ? `${comment.authorName} (익명)` : comment.authorName
  const postUrl = `${siteMetadata.siteUrl}/ko/blog/${postSlug}#comment-${comment.id}`
  const adminUrl = `${siteMetadata.siteUrl}/admin/comments`

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'uyeon.dev 댓글',
      embeds: [
        {
          title: `새 댓글 · ${truncate(author, 80)}`,
          // 마크다운 원문을 그대로 넣으면 디스코드가 다시 해석하므로 코드블록으로 감싼다
          description: `\`\`\`\n${truncate(comment.bodyMd, 1500)}\n\`\`\``,
          url: postUrl,
          color: 0x0ea5e9,
          fields: [
            { name: '글', value: postSlug, inline: true },
            {
              name: '바로가기',
              value: `[댓글 보기](${postUrl}) · [관리](${adminUrl})`,
              inline: true,
            },
          ],
          timestamp: comment.createdAt.toISOString(),
        },
      ],
    }),
  })

  // 알림 실패가 댓글 작성을 막지는 않지만, 조용히 사라지면 원인을 찾을 수 없다.
  // 웹훅이 삭제되거나 rate limit(채널당 30회/분)에 걸리면 여기서 드러난다.
  if (!response.ok) {
    console.error(
      `[comments] Discord 알림 실패: ${response.status} ${await response.text().catch(() => '')}`
    )
  }
}
