'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import CopyButton from '@/components/CopyButton'
import siteMetadata from '@/data/siteMetadata'
import { useI18n } from '@/lib/i18n/i18n-context'

const MCP_URL = `${siteMetadata.siteUrl}/mcp`
const CLAUDE_CODE_COMMAND = `claude mcp add --transport http uyeon-blog ${MCP_URL}`
const JSON_CONFIG = JSON.stringify(
  { mcpServers: { 'uyeon-blog': { type: 'http', url: MCP_URL } } },
  null,
  2
)

const TOOL_NAMES = [
  'posts_list',
  'post_get',
  'posts_search',
  'projects_list',
  'project_get',
  'about_get',
] as const

/** 복사 버튼이 달린 코드 스니펫 */
function Snippet({ text, label }: { text: string; label: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-gray-900 p-4 dark:bg-black/60">
      <pre className="grow overflow-x-auto text-sm leading-relaxed text-gray-100">{text}</pre>
      <CopyButton text={text} label={label} />
    </div>
  )
}

function SectionCard({
  icon,
  title,
  children,
  delay = 0,
}: {
  icon: string
  title: string
  children: React.ReactNode
  delay?: number
}) {
  return (
    <motion.section
      className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-gray-900/10 backdrop-blur-3xl dark:border-gray-600/80 dark:bg-gray-800/70 dark:shadow-primary-500/10"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay }}
    >
      <h2 className="mb-3 flex items-center gap-2 text-xl font-bold dark:text-gray-100">
        <Icon icon={icon} className="text-primary-500 text-2xl" />
        {title}
      </h2>
      {children}
    </motion.section>
  )
}

export default function AiPageClient() {
  const { t } = useI18n()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="divide-y divide-gray-200 dark:divide-gray-700"
    >
      <div className="space-y-2 pt-6 pb-8 md:space-y-5">
        <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl dark:text-gray-100">
          {t('pages.ai.title')}
        </h1>
        <p className="text-lg leading-7 text-gray-500 dark:text-gray-400">
          {t('pages.ai.description')}
        </p>
      </div>

      <div className="space-y-6 py-12">
        <p className="text-gray-600 dark:text-gray-300">{t('pages.ai.intro')}</p>

        <SectionCard icon="solar:chat-round-dots-bold" title={t('pages.ai.claudeAiTitle')}>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
            {t('pages.ai.claudeAiSteps')}
          </p>
          <Snippet text={MCP_URL} label={t('pages.ai.copy')} />
        </SectionCard>

        <SectionCard
          icon="solar:programming-bold"
          title={t('pages.ai.claudeCodeTitle')}
          delay={0.05}
        >
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
            {t('pages.ai.claudeCodeSteps')}
          </p>
          <Snippet text={CLAUDE_CODE_COMMAND} label={t('pages.ai.copy')} />
        </SectionCard>

        <SectionCard icon="solar:settings-bold" title={t('pages.ai.otherTitle')} delay={0.1}>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
            {t('pages.ai.otherSteps')}
          </p>
          <Snippet text={JSON_CONFIG} label={t('pages.ai.copy')} />
        </SectionCard>

        <SectionCard icon="solar:widget-bold" title={t('pages.ai.toolsTitle')} delay={0.15}>
          <ul className="space-y-2">
            {TOOL_NAMES.map((name) => (
              <li
                key={name}
                className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3"
              >
                <code className="text-primary-600 dark:text-primary-400 shrink-0 font-mono text-sm font-semibold">
                  {name}
                </code>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {t(`pages.ai.tools.${name}`)}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard icon="solar:info-circle-bold" title={t('pages.ai.noticeTitle')} delay={0.2}>
          <ul className="list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <li>{t('pages.ai.notice1')}</li>
            <li>{t('pages.ai.notice2')}</li>
            <li>
              {t('pages.ai.llmsTxt')}{' '}
              <a
                href="/llms.txt"
                className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 underline underline-offset-2"
              >
                llms.txt
              </a>
              {' · '}
              <a
                href="/llms-full.txt"
                className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 underline underline-offset-2"
              >
                llms-full.txt
              </a>
            </li>
          </ul>
        </SectionCard>
      </div>
    </motion.div>
  )
}
