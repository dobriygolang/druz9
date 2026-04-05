import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { MobileNav } from '@/widgets/MobileNav/ui/MobileNav'
import { PageTransition } from '@/shared/ui/PageTransition'

export function PageLayout() {
  return (
    <div className="min-h-screen bg-[#F2F3F0]">
      {/* Centered max-width container for very wide screens */}
      <div className="flex min-h-screen max-w-[1600px] mx-auto">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto pb-[64px] md:pb-0">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
