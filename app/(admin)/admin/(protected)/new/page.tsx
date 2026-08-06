'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function NewPostPage() {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '생성에 실패했습니다')
        return
      }
      router.push(`/admin/${data.id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-xl font-bold text-gray-900 dark:text-gray-100">새 글 작성</h1>
      <form onSubmit={create} className="space-y-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Slug (URL 경로, 소문자/숫자/하이픈)
          </span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="my-new-post"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            required
            className="admin-input"
          />
        </label>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button type="submit" disabled={creating} className="admin-btn-primary w-full">
          {creating ? '생성 중…' : '작성 시작'}
        </button>
      </form>
    </div>
  )
}
