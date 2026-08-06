import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'
import { assertLocale } from '@/lib/i18n/route'
import { getTranslations } from '@/lib/i18n/translate'
import AiPageClient from './AiPageClient'

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = assertLocale((await props.params).locale)
  const t = getTranslations(locale)
  return genPageMetadata({
    locale,
    seg: 'ai',
    title: t('pages.ai.title'),
    description: t('pages.ai.description'),
  })
}

export default function Page() {
  return <AiPageClient />
}
