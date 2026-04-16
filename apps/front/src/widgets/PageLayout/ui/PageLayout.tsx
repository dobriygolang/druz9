import { memo } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { MobileNav } from '@/widgets/MobileNav/ui/MobileNav'
import { PageTransition } from '@/shared/ui/PageTransition'
import { FloatingLeaves } from '@/shared/ui/FloatingLeaves'
import { AudioPlayerBar } from '@/features/Podcast/ui/AudioPlayerBar'
import { useAudioPlayer } from '@/features/Podcast/providers/AudioPlayerProvider'

const MemoSidebar = memo(Sidebar)
const MemoMobileNav = memo(MobileNav)

export function PageLayout() {
  const { playing } = useAudioPlayer()
  const mainPadding = playing ? 'pb-[198px] md:pb-[76px]' : 'pb-[116px] md:pb-0'

  return (
    <div className="relative h-screen overflow-hidden bg-[#F0F5F1] dark:bg-[#0B1210] transition-colors duration-300">
      <FloatingLeaves />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(5,150,105,0.16),_transparent_62%)] dark:bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.2),_transparent_58%)] md:hidden" />

      <div className="relative mx-auto flex h-full max-w-[1600px]">
        <MemoSidebar />

        <main className={`relative flex-1 h-full min-w-0 overflow-x-hidden overflow-y-auto pt-[104px] md:pt-0 ${mainPadding}`}>
          <PageTransition className="h-full">
            <Outlet />
          </PageTransition>
        </main>
      </div>

      <MemoMobileNav />
      <AudioPlayerBar />
    </div>
  )
}
