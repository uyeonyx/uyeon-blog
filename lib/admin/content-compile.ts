import { compilePostMdx } from '@/lib/mdx/compile'
import { serializeToMdx } from '@/lib/mdx/serialize'

export interface PreparedContent {
  contentMd: string
  compiledCode: string | null
  toc: unknown
  readingTime: unknown
  compiledAt: Date | null
  error: string | null
}

/**
 * Tiptap JSON → MDX 직렬화 + 컴파일. 컴파일이 실패해도 직렬화된 contentMd까지는
 * 보존해 원본 유실을 막는다 (posts/projects/authors 공용).
 */
export async function prepareContent(contentJson: unknown): Promise<PreparedContent> {
  let contentMd = ''
  let error: string | null = null
  if (contentJson) {
    try {
      contentMd = serializeToMdx(contentJson)
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }

  let compiled: { code: string; toc: unknown; readingTime: unknown } | null = null
  if (!error) {
    try {
      compiled = await compilePostMdx(contentMd)
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }

  return {
    contentMd,
    compiledCode: compiled?.code ?? null,
    toc: compiled?.toc ?? null,
    readingTime: compiled?.readingTime ?? null,
    compiledAt: compiled ? new Date() : null,
    error,
  }
}
