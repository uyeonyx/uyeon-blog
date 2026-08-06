import AdminHeader from '@/components/admin/AdminHeader'
import { DirtyGuardProvider } from '@/components/admin/DirtyGuard'
import { AdminToastProvider } from '@/components/admin/ui/toast'
import { requireAdmin } from '@/lib/admin/session'

export const metadata = {
  robots: { index: false, follow: false },
}

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()

  return (
    <AdminToastProvider>
      <DirtyGuardProvider>
        <AdminHeader login={session.login} />
        <main className="mx-auto max-w-5xl px-4 pt-4 pb-16 sm:px-6">{children}</main>
      </DirtyGuardProvider>
    </AdminToastProvider>
  )
}
