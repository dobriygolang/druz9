import type { ReactNode } from 'react'

export type EmptyStateKind = 'default' | 'error' | 'offline' | 'no-friends' | 'no-quests'

export function EmptyState({
  kind = 'default',
  title,
  message,
  action,
}: {
  kind?: EmptyStateKind
  title?: string
  message?: string
  action?: ReactNode
}) {
  const defaults: Record<EmptyStateKind, { title: string; message: string; icon: string }> = {
    default: {
      title: title ?? 'Nothing here yet',
      message: message ?? 'Come back later, or try a different filter.',
      icon: '✦',
    },
    error: {
      title: title ?? 'The scroll tore',
      message: message ?? 'Something broke while loading. Try again in a moment.',
      icon: '⚠',
    },
    offline: {
      title: title ?? 'Offline',
      message: message ?? 'You are not connected. Check your network and retry.',
      icon: '⌁',
    },
    'no-friends': {
      title: title ?? 'No fellowship yet',
      message: message ?? 'Invite a friend, or find someone in the Tavern or Arena.',
      icon: '👥',
    },
    'no-quests': {
      title: title ?? 'No quests today',
      message:
        message ?? 'You cleared your daily pact. New quests arrive in a few hours.',
      icon: '✔',
    },
  }
  const d = defaults[kind]
  return (
    <div
      className="rpg-panel rpg-panel--recessed"
      style={{
        textAlign: 'center',
        padding: '40px 20px',
      }}
    >
      <div style={{ fontSize: 42, lineHeight: 1, marginBottom: 10 }}>{d.icon}</div>
      <h3
        className="font-display"
        style={{ fontSize: 20, margin: '0 0 6px', color: 'var(--ink-0)' }}
      >
        {d.title}
      </h3>
      <p
        style={{
          color: 'var(--ink-2)',
          fontSize: 13,
          maxWidth: 420,
          margin: '0 auto 14px',
        }}
      >
        {d.message}
      </p>
      {action}
    </div>
  )
}
