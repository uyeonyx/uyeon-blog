'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AdminButton, AdminInput, GlassCard } from '@/components/admin/ui/primitives'

export default function NewProjectPage() {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '생성에 실패했습니다')
        return
      }
      router.push(`/admin/projects/${data.id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto mt-8 max-w-md"
    >
      <GlassCard innerClassName="p-8">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">
          <span className="block bg-linear-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent dark:from-gray-50 dark:via-gray-300 dark:to-gray-50">
            새 프로젝트
          </span>
        </h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          프로젝트를 식별할 slug를 정하면 바로 에디터가 열립니다.
        </p>
        <form onSubmit={create} className="space-y-4">
          <div className="flex flex-col gap-1.5 text-sm">
            <label htmlFor="new-slug" className="font-medium text-gray-700 dark:text-gray-300">
              Slug
            </label>
            <AdminInput
              id="new-slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="my-project"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              required
            />
            <span className="text-xs text-gray-400 dark:text-gray-500">
              소문자·숫자·하이픈만 사용할 수 있습니다
            </span>
          </div>
          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
          <AdminButton
            variant="primary"
            type="submit"
            disabled={creating}
            className="w-full justify-center"
          >
            {creating ? (
              <Icon icon="solar:refresh-bold" className="size-4 animate-spin" />
            ) : (
              <Icon icon="solar:add-circle-bold" className="size-4" />
            )}
            만들기
          </AdminButton>
        </form>
      </GlassCard>
    </motion.div>
  )
}
