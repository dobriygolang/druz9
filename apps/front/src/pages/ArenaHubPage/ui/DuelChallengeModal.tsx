import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { RpgButton, Badge } from '@/shared/ui/pixel'
import { socialApi } from '@/features/Social/api/socialApi'
import { inboxApi } from '@/features/Inbox/api/inboxApi'
import { PresenceStatus, type Friend } from '@/features/Social/model/types'
import { useAuth } from '@/app/providers/AuthProvider'

type DuelMode = '1v1' | '2v2'

interface Props {
  open: boolean
  defaultMode?: DuelMode
  onClose: () => void
}

function presenceDot(status: PresenceStatus) {
  const color =
    status === PresenceStatus.ONLINE
      ? 'var(--moss-3)'
      : status === PresenceStatus.AWAY
      ? 'var(--ember-2)'
      : 'var(--ink-3)'
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        border: '1px solid var(--ink-0)',
        flexShrink: 0,
      }}
    />
  )
}

export function DuelChallengeModal({ open, defaultMode = '2v2', onClose }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Friend | null>(null)
  const [mode, setMode] = useState<DuelMode>(defaultMode)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setSelected(null)
      setSent(false)
      setError(null)
      setMode(defaultMode)
      return
    }
    setLoading(true)
    socialApi
      .listFriends({ limit: 50 })
      .then((r) => setFriends(r.friends))
      .catch(() => setFriends([]))
      .finally(() => setLoading(false))
  }, [open, defaultMode])

  if (!open) return null

  const handleSend = async () => {
    if (!selected || !user) return
    setSending(true)
    setError(null)
    try {
      const { threadId } = await inboxApi.createThread(selected.userId)
      const modeLabel = mode === '1v1' ? '1v1' : '2v2'
      const body = t('arena.challenge.inviteMessage', {
        defaultValue: `⚔ ${user.username ?? 'A player'} challenges you to a ${modeLabel} duel! Head to the Arena to accept.`,
        username: user.username ?? 'A player',
        mode: modeLabel,
      })
      await inboxApi.sendMessage(threadId, body)
      setSent(true)
    } catch {
      setError(t('arena.challenge.sendError', { defaultValue: 'Failed to send — try again' }))
    } finally {
      setSending(false)
    }
  }

  const sortedFriends = [...friends].sort((a, b) => {
    if (a.presence === b.presence) return a.username.localeCompare(b.username)
    return a.presence - b.presence
  })

  return (
    <div className="rpg-modal-backdrop" onClick={onClose}>
      <div
        className="rpg-panel"
        style={{ maxWidth: 380, width: '100%', padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <h3 className="font-display" style={{ fontSize: 18 }}>
            {t('arena.challenge.title', { defaultValue: 'Challenge a friend' })}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Silkscreen, Unbounded, monospace', fontSize: 12, color: 'var(--ink-2)' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Mode picker */}
        <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 6 }}>
          {t('arena.challenge.mode', { defaultValue: 'Mode' })}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['1v1', '2v2'] as DuelMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '8px 0',
                border: `2px solid ${mode === m ? 'var(--ember-1)' : 'var(--ink-2)'}`,
                background: mode === m ? 'var(--ember-0)' : 'var(--parch-2)',
                fontFamily: 'Pixelify Sans, Unbounded, monospace',
                fontSize: 14,
                cursor: 'pointer',
                color: mode === m ? 'var(--ember-3)' : 'var(--ink-1)',
                boxShadow: mode === m ? '2px 2px 0 var(--ink-0)' : '2px 2px 0 var(--ink-2)',
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Friend list */}
        <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 6 }}>
          {t('arena.challenge.pickFriend', { defaultValue: 'Pick a friend' })}
        </div>
        <div style={{ maxHeight: 200, overflowY: 'auto', border: '2px solid var(--ink-0)', marginBottom: 16 }}>
          {loading && (
            <div style={{ padding: '12px 14px', fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 12, color: 'var(--ink-2)' }}>
              {t('common.loading', { defaultValue: 'Loading…' })}
            </div>
          )}
          {!loading && sortedFriends.length === 0 && (
            <div style={{ padding: '12px 14px', fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 12, color: 'var(--ink-2)' }}>
              {t('arena.challenge.noFriends', { defaultValue: 'No friends yet — add some first!' })}
            </div>
          )}
          {sortedFriends.map((f) => (
            <button
              key={f.userId}
              onClick={() => setSelected(f)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 14px',
                background: selected?.userId === f.userId ? 'var(--ember-0)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--ink-3)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {presenceDot(f.presence)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 13, color: 'var(--ink-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.displayName || f.username}
                </div>
                {f.guildName && (
                  <div style={{ fontFamily: 'Silkscreen, Unbounded, monospace', fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.05em' }}>
                    {f.guildName}
                  </div>
                )}
              </div>
              {f.presence === PresenceStatus.ONLINE && (
                <Badge variant="ember" style={{ fontSize: 8 }}>
                  {t('arena.challenge.online', { defaultValue: 'online' })}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 11, color: 'var(--ember-3)', marginBottom: 10 }}>
            {error}
          </div>
        )}

        {sent ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '8px 0' }}>
            <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 13, color: 'var(--moss-3)' }}>
              {t('arena.challenge.sent', { defaultValue: '⚔ Challenge sent!', username: selected?.displayName || selected?.username })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <RpgButton size="sm" variant="ghost" onClick={() => navigate('/inbox?tab=friends')}>
                {t('arena.challenge.viewInbox', { defaultValue: 'View in inbox' })}
              </RpgButton>
              <RpgButton size="sm" onClick={onClose}>
                {t('common.close', { defaultValue: 'Close' })}
              </RpgButton>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <RpgButton size="sm" variant="ghost" onClick={onClose}>
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </RpgButton>
            <RpgButton
              size="sm"
              variant="primary"
              onClick={() => void handleSend()}
              disabled={!selected || sending}
            >
              {sending
                ? t('arena.challenge.sending', { defaultValue: 'Sending…' })
                : t('arena.challenge.send', { defaultValue: '⚔ Challenge' })}
            </RpgButton>
          </div>
        )}
      </div>
    </div>
  )
}
