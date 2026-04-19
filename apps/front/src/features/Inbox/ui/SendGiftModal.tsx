// #5 — SendGiftModal. Pulls the sender's owned-but-unequipped items from
// shopApi and lets them pick one to send to `recipientId`. Open from any
// page that knows the recipient (profile pages, friends list).
import { useEffect, useState } from 'react'
import { Panel, RpgButton, Badge } from '@/shared/ui/pixel'
import { shopApi } from '@/features/Shop/api/shopApi'
import type { OwnedItem } from '@/features/Shop/model/types'
import { giftsApi } from '@/features/Inbox/api/giftsApi'

interface Props {
  recipientId: string
  recipientName?: string
  onClose: () => void
  onSent?: () => void
}

export function SendGiftModal({ recipientId, recipientName, onClose, onSent }: Props) {
  const [owned, setOwned] = useState<OwnedItem[] | null>(null)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    shopApi.getInventory()
      .then((list) => { if (!cancelled) setOwned(list.filter((o) => !o.equipped)) })
      .catch(() => { if (!cancelled) setOwned([]) })
    return () => { cancelled = true }
  }, [])

  const send = async () => {
    if (!pickedId) return
    setBusy(true)
    setError(null)
    try {
      await giftsApi.send(recipientId, pickedId, note.trim())
      onSent?.()
      onClose()
    } catch (e) {
      const m = e as { response?: { data?: { message?: string } }; message?: string }
      setError(m.response?.data?.message ?? m.message ?? 'Не удалось отправить')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 92vw)' }}>
        <Panel style={{ padding: 18 }}>
          <div className="font-display" style={{ fontSize: 18, marginBottom: 4 }}>
            Подарить предмет
          </div>
          <div style={{ color: 'var(--ink-2)', fontSize: 12, marginBottom: 14 }}>
            Получатель: <strong>{recipientName ?? recipientId.slice(0, 8)}</strong>.
            Предмет уйдёт из твоего инвентаря и появится у получателя как ожидающий
            подарок — он сможет принять или отклонить.
          </div>

          {!owned && <div style={{ color: 'var(--ink-2)' }}>Загрузка инвентаря…</div>}
          {owned && owned.length === 0 && (
            <div style={{ color: 'var(--ink-2)' }}>
              Нечего дарить — все предметы либо надеты, либо инвентарь пуст. Купи что-нибудь в таверне.
            </div>
          )}
          {owned && owned.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
              gap: 10,
              maxHeight: 280, overflow: 'auto',
              padding: 4,
              border: '2px solid var(--ink-3)',
              background: 'var(--parch-1)',
            }}>
              {owned.map((o) => {
                const sel = pickedId === o.item.id
                return (
                  <button key={o.item.id}
                    onClick={() => setPickedId(o.item.id)}
                    style={{
                      padding: 8,
                      background: sel ? 'var(--parch-2)' : 'var(--parch-0)',
                      border: `2px solid ${sel ? 'var(--ember-1)' : 'var(--ink-0)'}`,
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    }}>
                    {o.item.iconRef && (o.item.iconRef.startsWith('/') || o.item.iconRef.startsWith('http'))
                      ? <img src={o.item.iconRef} alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} />
                      : <div style={{ width: 48, height: 48, background: 'var(--parch-3)' }} />}
                    <div style={{ fontSize: 11, textAlign: 'center', lineHeight: 1.2 }}>{o.item.name}</div>
                    {sel && <Badge variant="ember" style={{ fontSize: 9 }}>выбран</Badge>}
                  </button>
                )
              })}
            </div>
          )}

          <textarea
            placeholder="Записка (необязательно)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            style={{
              width: '100%', minHeight: 60, marginTop: 12, padding: 10,
              border: '2px solid var(--ink-0)', background: 'var(--parch-0)',
              fontFamily: 'IBM Plex Sans, system-ui',
              boxShadow: 'inset 2px 2px 0 var(--parch-3)',
              resize: 'vertical',
            }}
          />

          {error && <div style={{ color: 'var(--ember-1)', fontSize: 12, marginTop: 8 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <RpgButton size="sm" onClick={onClose}>Отмена</RpgButton>
            <RpgButton size="sm" variant="primary" disabled={!pickedId || busy} onClick={send}>
              {busy ? 'Отправляем…' : 'Подарить'}
            </RpgButton>
          </div>
        </Panel>
      </div>
    </div>
  )
}
