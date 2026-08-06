import type { NextRequest } from 'next/server'
import {
  getAuthorForEdit,
  revalidateAuthors,
  saveAuthorTranslation,
  updateAuthorMeta,
  validateTechStack,
  validateTimeline,
} from '@/lib/admin/author-service'
import { LANGUAGES } from '@/lib/admin/post-service'
import { requireAdminApi } from '@/lib/admin/session'

export async function GET() {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const { author, translations } = await getAuthorForEdit('default')
  return Response.json({
    id: author.id,
    slug: author.slug,
    avatarUrl: author.avatarUrl,
    email: author.email,
    github: author.github,
    linkedin: author.linkedin,
    twitter: author.twitter,
    bluesky: author.bluesky,
    translations: Object.fromEntries(
      translations.map((t) => [
        t.language,
        {
          name: t.name,
          occupation: t.occupation,
          company: t.company,
          techStack: t.techStack,
          timeline: t.timeline,
          contentJson: t.contentJson,
          compileOk: !!t.compiledCode || !t.contentMd.trim(),
        },
      ])
    ),
  })
}

export async function PUT(request: NextRequest) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Invalid body' }, { status: 400 })

  const { author } = await getAuthorForEdit('default')

  // jsonb shape 사전 검증 (언어별)
  for (const language of LANGUAGES) {
    const input = body.translations?.[language]
    if (!input) continue
    if (input.techStack != null) {
      const err = validateTechStack(input.techStack)
      if (err) return Response.json({ error: `[${language}] ${err}` }, { status: 400 })
    }
    if (input.timeline != null) {
      const err = validateTimeline(input.timeline)
      if (err) return Response.json({ error: `[${language}] ${err}` }, { status: 400 })
    }
  }

  await updateAuthorMeta(author.id, {
    avatarUrl: typeof body.avatarUrl === 'string' ? body.avatarUrl : undefined,
    email: typeof body.email === 'string' ? body.email : undefined,
    github: typeof body.github === 'string' ? body.github : undefined,
    linkedin: typeof body.linkedin === 'string' ? body.linkedin : undefined,
    twitter: typeof body.twitter === 'string' ? body.twitter : undefined,
    bluesky: typeof body.bluesky === 'string' ? body.bluesky : undefined,
  })

  const compileResults: Awaited<ReturnType<typeof saveAuthorTranslation>>[] = []
  for (const language of LANGUAGES) {
    const input = body.translations?.[language]
    if (input) {
      compileResults.push(
        await saveAuthorTranslation(author.id, language, {
          name: String(input.name ?? ''),
          occupation: input.occupation ? String(input.occupation) : null,
          company: input.company ? String(input.company) : null,
          techStack: input.techStack ?? undefined,
          timeline: input.timeline ?? undefined,
          contentJson: input.contentJson ?? null,
        })
      )
    }
  }

  revalidateAuthors()
  return Response.json({ ok: true, compileResults })
}
