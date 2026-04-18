import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { HeroStrip } from '@/widgets/HeroStrip'
import { Sidebar } from '@/widgets/Sidebar'
import { OnboardingFlow } from '@/widgets/Onboarding'
import {
  TweaksPanel,
  ToastStack,
  NotificationsPanel,
  LevelUpModal,
  KeyboardHintPanel,
  StreakRecoveryModal,
  SeasonCompleteModal,
  TourMode,
  DemoFlowOverlay,
} from '@/widgets/Overlays'
import { useApplySeasonToHtml, useGameUser } from '@/shared/lib/gameState'
import { useKeyboardShortcuts } from '@/shared/lib/useKeyboardShortcuts'

// `useGameUser` here feeds demo-only overlay props (level-up demo, streak
// demo) — those modals accept numeric inputs so we don't need real profile
// progress here. For production identity we use `useAuth()` everywhere else.

function needsOnboarding() {
  return !localStorage.getItem('druz9_onboarding_done')
}

export function PageLayout() {
  useApplySeasonToHtml()
  const user = useGameUser()

  const [tweaksOpen, setTweaksOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(() => needsOnboarding())
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [streakRecoveryOpen, setStreakRecoveryOpen] = useState(false)
  const [seasonCompleteOpen, setSeasonCompleteOpen] = useState(false)
  const [tourActive, setTourActive] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)

  useKeyboardShortcuts({ onHelp: () => setShortcutsOpen(true) })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HeroStrip
        onOpenTweaks={() => setTweaksOpen(true)}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onOpenNotifs={() => setNotifsOpen(true)}
      />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main
          className="app-main"
          style={{
            flex: 1,
            marginLeft: 228,
            padding: '28px 32px 56px',
            maxWidth: '100%',
            minWidth: 0,
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* global overlays — NotificationBell now lives inside HeroStrip */}
      <TweaksPanel
        open={tweaksOpen}
        onClose={() => setTweaksOpen(false)}
        onOpenNotifs={() => setNotifsOpen(true)}
        onOpenLevelUp={() => setLevelUpOpen(true)}
        onOpenOnboarding={() => setOnboardingOpen(true)}
        onOpenStreakRecovery={() => setStreakRecoveryOpen(true)}
        onOpenSeasonComplete={() => setSeasonCompleteOpen(true)}
        onStartTour={() => setTourActive(true)}
        onOpenDemo={() => setDemoOpen(true)}
      />
      <ToastStack />
      {notifsOpen && <NotificationsPanel onClose={() => setNotifsOpen(false)} />}
      <LevelUpModal
        open={levelUpOpen}
        level={user.level + 1}
        onClose={() => setLevelUpOpen(false)}
      />
      {onboardingOpen && (
        <OnboardingFlow onFinish={() => setOnboardingOpen(false)} />
      )}
      {shortcutsOpen && (
        <KeyboardHintPanel onClose={() => setShortcutsOpen(false)} />
      )}
      {streakRecoveryOpen && (
        <StreakRecoveryModal
          streakBefore={user.streak}
          onUseShield={() => setStreakRecoveryOpen(false)}
          onDismiss={() => setStreakRecoveryOpen(false)}
        />
      )}
      {tourActive && <TourMode onEnd={() => setTourActive(false)} />}
      {demoOpen && <DemoFlowOverlay onClose={() => setDemoOpen(false)} />}
      {seasonCompleteOpen && (
        <SeasonCompleteModal
          seasonNumber={3}
          seasonName="The Ember Pact"
          finalRank={847}
          totalPlayers={42180}
          percentile={2}
          xpEarned={18420}
          goldEarned={3200}
          trophiesEarned={128}
          onClose={() => setSeasonCompleteOpen(false)}
        />
      )}
    </div>
  )
}
