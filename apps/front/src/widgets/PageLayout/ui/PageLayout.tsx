import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { MobileNav } from '@/widgets/MobileNav/ui/MobileNav'
import { PageTransition } from '@/shared/ui/PageTransition'
import { AudioPlayerBar } from '@/features/Podcast/ui/AudioPlayerBar'
import { useAudioPlayer } from '@/features/Podcast/providers/AudioPlayerProvider'

export function PageLayout() {
  const { playing } = useAudioPlayer()
  const mainPadding = playing ? 'pb-[198px] md:pb-[76px]' : 'pb-[116px] md:pb-0'

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F2F3F0] dark:bg-[#0f1117] transition-colors duration-300">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_62%)] dark:bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.2),_transparent_58%)] md:hidden" />

      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <Sidebar />

        <main className={`relative flex-1 min-w-0 overflow-x-hidden overflow-y-auto pt-[104px] md:pt-0 ${mainPadding}`}>
          <PageTransition className="min-h-full">
            <Outlet />
          </PageTransition>
        </main>
      </div>

      <MobileNav />
      <AudioPlayerBar />
    </div>
  )
}
