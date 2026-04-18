import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, RpgButton, Badge, PageHeader } from '@/shared/ui/pixel'
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi'
import type { Room } from '@/entities/CodeRoom/model/types'
import { play } from '@/shared/lib/sound'

export function CodeRoomsIndexPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rs = await codeRoomApi.listRooms()
      setRooms(rs)
    } catch (e) {
      console.error('code rooms list:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const createNew = async () => {
    if (creating) return
    setCreating(true)
    try {
      const { room } = await codeRoomApi.createRoom({ mode: 'ROOM_MODE_ALL' })
      play('questAccept')
      navigate(`/code-rooms/${room.id}`)
    } catch (e) {
      console.error('create room:', e)
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={t('rooms.eyebrow')}
        title={t('rooms.title')}
        subtitle={t('rooms.subtitle')}
        right={
          <RpgButton size="sm" variant="primary" onClick={() => void createNew()} disabled={creating}>
            {creating ? t('rooms.creating') : t('rooms.newRoom')}
          </RpgButton>
        }
      />

      <Panel variant="dark" style={{ marginBottom: 18 }}>
        <div
          className="font-silkscreen uppercase"
          style={{ fontSize: 10, color: 'var(--ember-3)', letterSpacing: '0.1em', marginBottom: 6 }}
        >
          ⌨ {t('rooms.howItWorks')}
        </div>
        <div style={{ fontSize: 13, color: 'var(--parch-2)', lineHeight: 1.55 }}>
          {t('rooms.howItWorksBody')}
        </div>
      </Panel>

      <Panel style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '10px 14px',
            background: 'var(--parch-2)',
            borderBottom: '2px solid var(--ink-0)',
          }}
        >
          <span
            className="font-silkscreen uppercase"
            style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
          >
            {t('rooms.activeRooms', { count: rooms.length })}
          </span>
        </div>

        {loading && <Empty label={t('rooms.loading')} />}
        {!loading && rooms.length === 0 && (
          <Empty label={t('rooms.empty')} />
        )}

        {rooms.map((room, i) => (
          <div
            key={room.id}
            onClick={() => navigate(`/code-rooms/${room.id}`)}
            style={{
              padding: '12px 16px',
              borderBottom: i < rooms.length - 1 ? '1px dashed var(--ink-3)' : 'none',
              cursor: 'pointer',
              display: 'grid',
              gridTemplateColumns: '48px 1fr auto',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                background: 'var(--parch-2)',
                border: '2px solid var(--ink-0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              ⌨
            </div>
            <div>
              <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 14 }}>
                {room.task || t('rooms.untitledTask')}
              </div>
              <div
                className="font-silkscreen uppercase"
                style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.06em', marginTop: 2 }}
              >
                {t('rooms.inRoom', { count: room.participants?.length ?? 0 })}
                {room.language ? ` · ${room.language}` : ''}
                {room.isPrivate ? ` · ${t('rooms.private')}` : ` · ${t('rooms.public')}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Badge variant={room.status === 'ROOM_STATUS_ACTIVE' ? 'moss' : 'dark'}>
                {room.status === 'ROOM_STATUS_ACTIVE'
                  ? t('rooms.status.active')
                  : room.status === 'ROOM_STATUS_WAITING'
                    ? t('rooms.status.waiting')
                    : room.status === 'ROOM_STATUS_FINISHED'
                      ? t('rooms.status.finished')
                      : t('rooms.status.idle')}
              </Badge>
              <span style={{ color: 'var(--ember-1)' }}>▸</span>
            </div>
          </div>
        ))}
      </Panel>
    </>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-2)', fontSize: 14 }}>
      {label}
    </div>
  )
}
