import { Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AdminSidebar } from '@/widgets/AdminSidebar/ui/AdminSidebar'
import { useAuth } from '@/app/providers/AuthProvider'
import { RpgButton } from '@/shared/ui/pixel'

export function AdminLayout() {
  const { user, isLoading } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Belt-and-suspenders gate — the Router also gates /admin/* behind
  // user.isAdmin, but if someone hot-swaps routes we still show the
  // "forbidden" shell rather than the admin surface.
  if (!isLoading && (!user || !user.isAdmin)) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 14,
          background: 'var(--parch-0)',
        }}
      >
        <div className="font-display" style={{ fontSize: 26 }}>
          {t('admin.forbidden', { defaultValue: 'Admin only' })}
        </div>
        <div style={{ color: 'var(--ink-2)', maxWidth: 380, textAlign: 'center', fontSize: 14 }}>
          {t('admin.forbiddenBody', { defaultValue: 'Your account does not have admin permissions for this panel.' })}
        </div>
        <RpgButton variant="primary" onClick={() => navigate('/hub')}>
          {t('admin.backToHub', { defaultValue: 'Back to hub' })}
        </RpgButton>
      </div>
    )
  }

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.username || user?.telegramUsername || 'Admin'

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--parch-0)',
      }}
    >
      {/* Top bar — styled to match the main app HeroStrip visually without
          cloning its gradient/sprite load. A clean banded header with the
          "ADMIN" badge makes the mode-switch obvious. */}
      <header
        style={{
          height: 52,
          borderBottom: '3px solid var(--ink-0)',
          background: 'linear-gradient(180deg, var(--ink-0) 0%, #1a140e 100%)',
          color: 'var(--parch-0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              background: 'var(--ember-1)',
              border: '2px solid var(--parch-0)',
              boxShadow: 'inset -2px -2px 0 var(--ember-0), inset 2px 2px 0 var(--ember-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Pixelify Sans, monospace',
              fontSize: 16,
              color: 'var(--parch-0)',
            }}
          >
            D9
          </div>
          <div>
            <div
              className="font-silkscreen uppercase"
              style={{ fontSize: 9, letterSpacing: '0.12em', color: 'var(--ember-3)' }}
            >
              ADMIN CONTROL
            </div>
            <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 14 }}>druz9 · manage</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            className="font-silkscreen uppercase"
            style={{
              padding: '4px 8px',
              background: 'var(--ember-1)',
              color: 'var(--ink-0)',
              border: '2px solid var(--parch-0)',
              fontSize: 10,
              letterSpacing: '0.1em',
            }}
          >
            ADMIN
          </span>
          <span
            className="font-silkscreen uppercase"
            style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--parch-2)' }}
          >
            {displayName}
          </span>
          <RpgButton size="sm" onClick={() => navigate('/hub')}>
            {t('admin.exit', { defaultValue: '← exit' })}
          </RpgButton>
        </div>
      </header>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <AdminSidebar />
        <main style={{ flex: 1, overflow: 'auto', padding: '28px 32px 56px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
