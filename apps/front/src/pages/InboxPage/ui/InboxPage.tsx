import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Panel, RpgButton, Badge, PageHeader } from '@/shared/ui/pixel'
import {
  inboxApi,
  ThreadKind,
  SenderKind,
  type InboxThread,
  type InboxMessage,
} from '@/features/Inbox'
import {
  socialApi,
  PresenceStatus,
  type Friend,
  type FriendRequest,
  type UserHit,
} from '@/features/Social'
import { SendGiftModal } from '@/features/Inbox/ui/SendGiftModal'
import { SendTradeModal } from '@/features/Inbox/ui/SendTradeModal'
import { Tour } from '@/features/Tour/ui/Tour'

const ENABLE_LEGACY_MESSAGES = import.meta.env.VITE_ENABLE_LEGACY_INBOX_MESSAGES === 'true'

const KIND_COLOR: Record<ThreadKind, string> = {
  [ThreadKind.UNSPECIFIED]: 'var(--ink-3)',
  [ThreadKind.MENTOR]:      'var(--ember-1)',
  [ThreadKind.GUILD]:       'var(--moss-1)',
  [ThreadKind.SYSTEM]:      'var(--r-legendary)',
  [ThreadKind.DUEL]:        'var(--r-epic)',
  [ThreadKind.CHALLENGE]:   'var(--r-rare)',
  [ThreadKind.FRIEND]:      'var(--sky-1, #4a90d9)',
}

const KIND_LABEL: Record<ThreadKind, string> = {
  [ThreadKind.UNSPECIFIED]: '—',
  [ThreadKind.MENTOR]:      'mentor',
  [ThreadKind.GUILD]:       'guild',
  [ThreadKind.SYSTEM]:      'system',
  [ThreadKind.DUEL]:        'duel',
  [ThreadKind.CHALLENGE]:   'challenge',
  [ThreadKind.FRIEND]:      'письмо',
}

// Relative-time formatter tuned for chat previews. Avoids a heavy date-fns dep
// for a single use site.
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  const days = Math.floor(diff / 86_400_000)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString()
}

type Tab = 'messages' | 'friends' | 'gifts' | 'trades'

export function InboxPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  // Tab lives in the query string so /social → /inbox?tab=friends works.
  const urlTab = useMemo<Tab>(() => {
    const q = new URLSearchParams(location.search).get('tab')
    if (q === 'friends') return 'friends'
    if (q === 'gifts') return 'gifts'
    if (q === 'trades') return 'trades'
    return ENABLE_LEGACY_MESSAGES ? 'messages' : 'gifts'
  }, [location.search])
  const [tab, setTab] = useState<Tab>(urlTab)
  useEffect(() => { setTab(urlTab) }, [urlTab])

  const [threads, setThreads] = useState<InboxThread[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [unreadTotal, setUnreadTotal] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load thread list once on mount.
  useEffect(() => {
    if (!ENABLE_LEGACY_MESSAGES) {
      setLoading(false)
      return
    }
    let cancelled = false
    inboxApi
      .listThreads()
      .then((resp) => {
        if (cancelled) return
        setThreads(resp.threads)
        setUnreadTotal(resp.unreadTotal)
        const deepThread = new URLSearchParams(location.search).get('thread')
        const target = deepThread && resp.threads.find((t) => t.id === deepThread)
        if (target) setActiveId(target.id)
        else if (resp.threads.length > 0) setActiveId(resp.threads[0].id)
      })
      .catch((e) => console.error('inbox: list threads', e))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When navigating to ?thread=xxx after mount (e.g. from friend Chat button),
  // re-fetch threads so the new thread appears and gets selected.
  const prevSearch = useRef(location.search)
  useEffect(() => {
    if (!ENABLE_LEGACY_MESSAGES) return
    const prev = prevSearch.current
    prevSearch.current = location.search
    const deepThread = new URLSearchParams(location.search).get('thread')
    if (!deepThread || location.search === prev) return
    inboxApi.listThreads().then((resp) => {
      setThreads(resp.threads)
      setUnreadTotal(resp.unreadTotal)
      const target = resp.threads.find((t) => t.id === deepThread)
      if (target) setActiveId(target.id)
    }).catch(() => undefined)
  }, [location.search])

  // Load messages + mark-read when active thread changes.
  useEffect(() => {
    if (!ENABLE_LEGACY_MESSAGES) return
    if (!activeId) return
    let cancelled = false
    inboxApi
      .getThread(activeId)
      .then((resp) => {
        if (cancelled) return
        setMessages(resp.messages)
      })
      .catch((e) => console.error('inbox: get thread', e))

    inboxApi
      .markThreadRead(activeId)
      .then((resp) => {
        if (cancelled) return
        setUnreadTotal(resp.unreadTotal)
        setThreads((prev) =>
          prev.map((t) => (t.id === activeId ? { ...t, unreadCount: 0 } : t)),
        )
      })
      .catch((e) => console.error('inbox: mark read', e))

    return () => {
      cancelled = true
    }
  }, [activeId])

  // Auto-scroll on new messages.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const active = threads.find((t) => t.id === activeId)

  const sendMessage = useCallback(async () => {
    const body = draft.trim()
    if (!body || !activeId || sending) return
    setSending(true)
    try {
      const resp = await inboxApi.sendMessage(activeId, body)
      setMessages((prev) => [...prev, resp.message])
      setThreads((prev) =>
        prev
          .map((t) =>
            t.id === activeId
              ? { ...t, preview: body.slice(0, 120), lastMessageAt: resp.message.createdAt }
              : t,
          )
          // resort so the active thread floats to the top after a reply
          .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()),
      )
      setDraft('')
    } catch (e) {
      console.error('inbox: send message', e)
    } finally {
      setSending(false)
    }
  }, [draft, activeId, sending])

  const switchTab = (next: Tab) => {
    setTab(next)
    const params = new URLSearchParams(location.search)
    if (next === 'messages' && ENABLE_LEGACY_MESSAGES) params.delete('tab')
    else params.set('tab', next)
    navigate({ pathname: '/inbox', search: params.toString() }, { replace: true })
  }

  const headerTitle = tab === 'friends'
    ? t('inbox.friendsTitle')
    : tab === 'trades'
      ? t('inbox.tradesTitle', { defaultValue: 'Обмены' })
      : tab === 'gifts'
        ? t('inbox.giftsTitle', { defaultValue: 'Подарки' })
        : t('inbox.messagesTitle')
  const headerSubtitle = tab === 'friends'
    ? t('inbox.friendsSubtitle')
    : tab === 'trades'
      ? t('inbox.tradesSubtitle', { defaultValue: 'Входящие и исходящие предложения обмена предметами.' })
      : tab === 'gifts'
        ? t('inbox.giftsSubtitle', { defaultValue: 'Предметы, которые можно принять или отклонить.' })
        : t('inbox.messagesSubtitle')

  return (
    <>
      <Tour
        tourId="inbox_intro"
        steps={[
          { selector: '[data-tour=inbox-tabs]', title: t('inbox.tour.tabsTitle', { defaultValue: 'Вкладки' }), body: t('inbox.tour.tabsBody', { defaultValue: 'Inbox теперь ведёт к объектным обменам: подаркам, трейдам и друзьям.' }) },
          { selector: '[data-tour=inbox-content]', title: t('inbox.tour.contentTitle', { defaultValue: 'Передача объектов' }), body: t('inbox.tour.contentBody', { defaultValue: 'Прими подарок, подтверди обмен или открой профиль друга.' }) },
        ]}
      />
      <PageHeader
        eyebrow={t('inbox.eyebrow')}
        title={headerTitle}
        subtitle={headerSubtitle}
        right={
          tab === 'messages' && unreadTotal > 0 ? (
            <Badge variant="ember">{t('inbox.unreadCount', { count: unreadTotal })}</Badge>
          ) : (
            <span
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
            >
              {tab === 'friends' ? t('inbox.community') : t('inbox.allRead')}
            </span>
          )
        }
      />

      {/* Tab switcher: messages ↔ friends */}
      <div data-tour="inbox-tabs" className="rpg-tabs" style={{ marginBottom: 14 }}>
        {ENABLE_LEGACY_MESSAGES && (
          <div
            className={`rpg-tab ${tab === 'messages' ? 'rpg-tab--active' : ''}`}
            onClick={() => switchTab('messages')}
          >
            {t('inbox.tab.messages')}
          </div>
        )}
        <div
          className={`rpg-tab ${tab === 'friends' ? 'rpg-tab--active' : ''}`}
          onClick={() => switchTab('friends')}
        >
          {t('inbox.tab.friends')}
        </div>
        <div
          className={`rpg-tab ${tab === 'gifts' ? 'rpg-tab--active' : ''}`}
          onClick={() => switchTab('gifts')}
        >
          {t('inbox.tab.gifts', { defaultValue: 'Подарки' })}
        </div>
        <div
          className={`rpg-tab ${tab === 'trades' ? 'rpg-tab--active' : ''}`}
          onClick={() => switchTab('trades')}
        >
          {t('inbox.tab.trades', { defaultValue: 'Обмены' })}
        </div>
      </div>

      <div data-tour="inbox-content">
      {tab === 'gifts' ? (
        <GiftsPanel />
      ) : tab === 'trades' ? (
        <TradesPanel />
      ) : tab === 'friends' ? (
        <FriendsPanel />
      ) : (
      <div
        className="rpg-inbox-grid"
        style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 18, minHeight: 560 }}
      >
        {/* Thread list */}
        <Panel style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '2px solid var(--ink-0)',
              background: 'var(--parch-2)',
            }}
          >
            <span
              className="font-silkscreen uppercase"
              style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
            >
              {t('inbox.conversations')}
            </span>
          </div>

          {loading && <EmptyState label={t('inbox.loadingThreads')} />}
          {!loading && threads.length === 0 && <EmptyState label={t('inbox.emptyInbox')} />}

          {threads.map((t) => (
            <ThreadRow
              key={t.id}
              thread={t}
              active={t.id === activeId}
              onClick={() => setActiveId(t.id)}
            />
          ))}
        </Panel>

        {/* Conversation */}
        <Panel style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {active ? (
            <>
              <ConversationHeader thread={active} />
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
                className="rpg-inbox-thread"
              >
                {messages.map((m) => (
                  <MessageBubble key={m.id} msg={m} avatar={active.avatar} />
                ))}
                <div ref={bottomRef} />
              </div>

              {active.interactive ? (
                <div
                  style={{
                    padding: '12px 18px',
                    borderTop: '2px solid var(--ink-0)',
                    background: 'var(--parch-2)',
                    display: 'flex',
                    gap: 10,
                  }}
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        void sendMessage()
                      }
                    }}
                    placeholder={t('inbox.writeMessage')}
                    disabled={sending}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: 'var(--parch-0)',
                      border: '3px solid var(--ink-0)',
                      fontFamily: 'Pixelify Sans, monospace',
                      fontSize: 13,
                      color: 'var(--ink-0)',
                      outline: 'none',
                      boxShadow: 'inset 2px 2px 0 var(--parch-3)',
                    }}
                  />
                  <RpgButton
                    variant="primary"
                    onClick={() => void sendMessage()}
                    disabled={!draft.trim() || sending}
                  >
                    {sending ? t('inbox.sending') : t('inbox.send')}
                  </RpgButton>
                </div>
              ) : (
                <div
                  style={{
                    padding: '12px 18px',
                    borderTop: '2px solid var(--ink-0)',
                    background: 'var(--parch-2)',
                    textAlign: 'center',
                    fontSize: 11,
                    color: 'var(--ink-2)',
                    fontFamily: 'Silkscreen, monospace',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {t('inbox.readOnlyBroadcast', { kind: KIND_LABEL[active.kind] })}
                </div>
              )}
            </>
          ) : (
            <EmptyState label={t('inbox.pickConversation')} />
          )}
        </Panel>
      </div>
      )}
      </div>
    </>
  )
}

// ---------- Gifts panel (#5 — replaces text DMs with item exchanges) ----------

function GiftsPanel() {
  const [side, setSide] = useState<'received' | 'sent'>('received')
  const [gifts, setGifts] = useState<import('@/features/Inbox/api/giftsApi').Gift[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const { giftsApi } = await import('@/features/Inbox/api/giftsApi')
    const list = side === 'received' ? await giftsApi.listReceived() : await giftsApi.listSent()
    setGifts(list)
    setLoading(false)
  }, [side])

  useEffect(() => { void reload().catch(() => setLoading(false)) }, [reload])

  const decide = async (giftId: string, action: 'claim' | 'decline') => {
    setBusy(giftId)
    try {
      const { giftsApi } = await import('@/features/Inbox/api/giftsApi')
      if (action === 'claim') await giftsApi.claim(giftId)
      else await giftsApi.decline(giftId)
      await reload()
    } finally { setBusy(null) }
  }

  return (
    <Panel style={{ padding: 14 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <RpgButton size="sm" variant={side === 'received' ? 'primary' : 'default'} onClick={() => setSide('received')}>
          Получено
        </RpgButton>
        <RpgButton size="sm" variant={side === 'sent' ? 'primary' : 'default'} onClick={() => setSide('sent')}>
          Отправлено
        </RpgButton>
      </div>
      {loading && <div style={{ color: 'var(--ink-2)' }}>Загрузка…</div>}
      {!loading && gifts.length === 0 && (
        <div style={{ color: 'var(--ink-2)', fontSize: 13 }}>
          {side === 'received'
            ? 'Подарков пока нет — друзья пришлют что-нибудь, как только поймут, что эта вкладка существует.'
            : 'Ты ещё никому ничего не отправлял. Зайди на профиль друга и нажми «Подарить».'}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {gifts.map((g) => (
          <div key={g.id} style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr auto',
            gap: 12,
            alignItems: 'center',
            padding: 12,
            border: '2px solid var(--ink-3)',
            background: g.status === 'pending' ? 'var(--parch-1)' : 'var(--parch-0)',
          }}>
            {g.itemIconRef ? (
              <img src={g.itemIconRef} alt="" style={{ width: 56, height: 56, objectFit: 'contain' }} />
            ) : (
              <div style={{ width: 56, height: 56, background: 'var(--parch-3)', border: '2px solid var(--ink-0)' }} />
            )}
            <div>
              <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 14 }}>
                {g.itemName} {' '}
                <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>
                  · {side === 'received' ? `от ${g.senderName}` : `→ recipient`}
                </span>
              </div>
              {g.note && <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>«{g.note}»</div>}
              <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>
                {g.status === 'pending' && '⌛ ожидает решения'}
                {g.status === 'claimed' && '✓ принято'}
                {g.status === 'declined' && '✕ отклонено'}
              </div>
            </div>
            {side === 'received' && g.status === 'pending' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <RpgButton size="sm" variant="primary" disabled={busy === g.id} onClick={() => decide(g.id, 'claim')}>
                  Принять
                </RpgButton>
                <RpgButton size="sm" disabled={busy === g.id} onClick={() => decide(g.id, 'decline')}>
                  Отклонить
                </RpgButton>
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  )
}

function TradesPanel() {
  const [side, setSide] = useState<'received' | 'sent'>('received')
  const [trades, setTrades] = useState<import('@/features/Inbox/api/tradesApi').Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const { tradesApi } = await import('@/features/Inbox/api/tradesApi')
    const list = side === 'received' ? await tradesApi.listReceived() : await tradesApi.listSent()
    setTrades(list)
    setLoading(false)
  }, [side])

  useEffect(() => { void reload().catch(() => setLoading(false)) }, [reload])

  const decide = async (tradeId: string, action: 'accept' | 'cancel') => {
    setBusy(tradeId)
    try {
      const { tradesApi } = await import('@/features/Inbox/api/tradesApi')
      if (action === 'accept') await tradesApi.accept(tradeId)
      else await tradesApi.cancel(tradeId)
      await reload()
    } finally { setBusy(null) }
  }

  return (
    <Panel style={{ padding: 14 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <RpgButton size="sm" variant={side === 'received' ? 'primary' : 'default'} onClick={() => setSide('received')}>
          Получено
        </RpgButton>
        <RpgButton size="sm" variant={side === 'sent' ? 'primary' : 'default'} onClick={() => setSide('sent')}>
          Отправлено
        </RpgButton>
      </div>
      {loading && <div style={{ color: 'var(--ink-2)' }}>Загрузка...</div>}
      {!loading && trades.length === 0 && (
        <div style={{ color: 'var(--ink-2)', fontSize: 13 }}>
          {side === 'received'
            ? 'Предложений обмена пока нет.'
            : 'Ты ещё не предлагал обмен. Открой друзей и нажми «Обмен».'}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {trades.map((trade) => (
          <div key={trade.id} style={{
            display: 'grid',
            gridTemplateColumns: '64px 1fr 64px auto',
            gap: 12,
            alignItems: 'center',
            padding: 12,
            border: '2px solid var(--ink-3)',
            background: trade.status === 'pending' ? 'var(--parch-1)' : 'var(--parch-0)',
          }}>
            <TradeIcon src={trade.initiatorItemIcon} />
            <div>
              <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 14 }}>
                {trade.initiatorItemName || trade.initiatorItemId.slice(0, 8)}
                <span style={{ color: 'var(--ink-2)' }}> → </span>
                {trade.counterpartyItemName || trade.counterpartyItemId.slice(0, 8)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 4 }}>
                {side === 'received' ? `от ${trade.initiatorName || trade.initiatorId.slice(0, 8)}` : `для ${trade.counterpartyId.slice(0, 8)}`}
                {' · '}
                {trade.status === 'pending' && 'ожидает решения'}
                {trade.status === 'accepted' && 'принято'}
                {trade.status === 'cancelled' && 'отменено'}
                {trade.status === 'declined' && 'отклонено'}
                {trade.status === 'expired' && 'истекло'}
              </div>
              {trade.note && <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>«{trade.note}»</div>}
            </div>
            <TradeIcon src={trade.counterpartyItemIcon} />
            {trade.status === 'pending' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {side === 'received' && (
                  <RpgButton size="sm" variant="primary" disabled={busy === trade.id} onClick={() => decide(trade.id, 'accept')}>
                    Принять
                  </RpgButton>
                )}
                <RpgButton size="sm" disabled={busy === trade.id} onClick={() => decide(trade.id, 'cancel')}>
                  {side === 'received' ? 'Отклонить' : 'Отменить'}
                </RpgButton>
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  )
}

function TradeIcon({ src }: { src?: string }) {
  if (src) return <img src={src} alt="" style={{ width: 56, height: 56, objectFit: 'contain' }} />
  return <div style={{ width: 56, height: 56, background: 'var(--parch-3)', border: '2px solid var(--ink-0)' }} />
}

// ---------- Friends panel (embedded in inbox) ----------

function FriendsPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [friends, setFriends] = useState<Friend[]>([])
  const [incoming, setIncoming] = useState<FriendRequest[]>([])
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [composeOpen, setComposeOpen] = useState(false)
  const [chattingId, setChattingId] = useState<string | null>(null)
  const [giftTarget, setGiftTarget] = useState<Friend | null>(null)
  const [tradeTarget, setTradeTarget] = useState<Friend | null>(null)

  const openChat = useCallback(async (userId: string) => {
    setChattingId(userId)
    try {
      const { threadId } = await inboxApi.createThread(userId)
      navigate(`/inbox?tab=messages&thread=${threadId}`)
    } catch (e) {
      console.error('inbox: create thread', e)
    } finally {
      setChattingId(null)
    }
  }, [navigate])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, pending] = await Promise.all([
        socialApi.listFriends(),
        socialApi.listPendingRequests(),
      ])
      setFriends(list.friends)
      setIncoming(pending.incoming)
      setOutgoing(pending.outgoing)
    } catch (e) {
      console.error('friends load:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const accept = async (id: string) => { await socialApi.acceptRequest(id); await load() }
  const decline = async (id: string) => { await socialApi.declineRequest(id); await load() }
  const remove = async (userId: string) => { await socialApi.removeFriend(userId); await load() }

  return (
    <div className="rpg-inbox-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
      {/* Friends list */}
      <Panel style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            padding: '10px 14px',
            background: 'var(--parch-2)',
            borderBottom: '2px solid var(--ink-0)',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            className="font-silkscreen uppercase"
            style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em', flex: 1 }}
          >
            {t('inbox.circleSummary', {
              total: friends.length,
              online: friends.filter(f => f.presence === PresenceStatus.ONLINE).length,
            })}
          </span>
          <RpgButton size="sm" variant="primary" onClick={() => setComposeOpen(true)}>
            {t('inbox.addFriend')}
          </RpgButton>
        </div>

        {loading && <EmptyState label={t('inbox.loadingFriends')} />}
        {!loading && friends.length === 0 && (
          <EmptyState label={t('inbox.noFriends')} />
        )}

        {friends.map((f, i) => (
          <div
            key={f.userId}
            style={{
              padding: '12px 16px',
              borderBottom: i < friends.length - 1 ? '1px dashed var(--ink-3)' : 'none',
              display: 'grid',
              gridTemplateColumns: '44px 1fr auto',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                background: 'var(--ink-0)',
                color: 'var(--parch-0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Pixelify Sans, monospace',
                fontSize: 14,
              }}
            >
              {(f.displayName || f.username).slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 14 }}>
                  {f.displayName || f.username}
                </span>
                {f.presence === PresenceStatus.ONLINE && <Badge variant="moss" style={{ fontSize: 8 }}>{t('inbox.online')}</Badge>}
                {f.presence === PresenceStatus.AWAY && <Badge variant="ember" style={{ fontSize: 8 }}>{t('inbox.away')}</Badge>}
                {f.isFavorite && <span style={{ color: 'var(--ember-1)' }}>★</span>}
              </div>
              <div
                className="font-silkscreen uppercase"
                style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.06em', marginTop: 2 }}
              >
                @{f.username}{f.guildName ? ` · ${f.guildName}` : ''}
                {f.lastActivity ? ` · ${f.lastActivity}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {ENABLE_LEGACY_MESSAGES && (
                <RpgButton
                  size="sm"
                  variant="ghost"
                  disabled={chattingId === f.userId}
                  onClick={() => void openChat(f.userId)}
                >
                  {chattingId === f.userId ? '...' : t('inbox.chat')}
                </RpgButton>
              )}
              <RpgButton size="sm" variant="ghost" onClick={() => setGiftTarget(f)}>
                {t('inbox.gift', { defaultValue: 'Подарить' })}
              </RpgButton>
              <RpgButton size="sm" variant="ghost" onClick={() => setTradeTarget(f)}>
                {t('inbox.trade', { defaultValue: 'Обмен' })}
              </RpgButton>
              <RpgButton size="sm" variant="ghost" onClick={() => void remove(f.userId)}>{t('inbox.remove')}</RpgButton>
            </div>
          </div>
        ))}
      </Panel>

      {/* Pending requests */}
      <Panel>
        <h3 className="font-display" style={{ fontSize: 15, marginBottom: 10 }}>{t('inbox.pending')}</h3>

        {incoming.length === 0 && outgoing.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{t('inbox.noRequests')}</div>
        )}

        {incoming.length > 0 && (
          <>
            <div
              className="font-silkscreen uppercase"
              style={{ fontSize: 9, color: 'var(--ember-1)', letterSpacing: '0.1em', marginBottom: 6 }}
            >
              {t('inbox.incomingCount', { count: incoming.length })}
            </div>
            {incoming.map((req) => (
              <div
                key={req.id}
                style={{
                  padding: '8px 10px',
                  border: '2px solid var(--ink-0)',
                  marginBottom: 6,
                  background: 'var(--parch-0)',
                }}
              >
                <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 13 }}>@{req.fromUsername}</div>
                {req.message && (
                  <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>{req.message}</div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <RpgButton size="sm" variant="primary" onClick={() => void accept(req.id)}>{t('inbox.accept')}</RpgButton>
                  <RpgButton size="sm" variant="ghost" onClick={() => void decline(req.id)}>{t('inbox.decline')}</RpgButton>
                </div>
              </div>
            ))}
          </>
        )}

        {outgoing.length > 0 && (
          <>
            <div
              className="font-silkscreen uppercase"
              style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em', marginTop: 10, marginBottom: 6 }}
            >
              {t('inbox.outgoingCount', { count: outgoing.length })}
            </div>
            {outgoing.map((req) => (
              <div
                key={req.id}
                style={{
                  padding: '6px 10px',
                  fontSize: 11,
                  color: 'var(--ink-2)',
                  borderLeft: '3px dashed var(--ink-3)',
                  marginBottom: 4,
                }}
              >
                {t('inbox.awaitingResponse', { user: req.toUserId.slice(0, 8) })}
              </div>
            ))}
          </>
        )}
      </Panel>

      {composeOpen && <ComposeFriendModal onClose={() => setComposeOpen(false)} onSent={load} />}
      {giftTarget && (
        <SendGiftModal
          recipientId={giftTarget.userId}
          recipientName={giftTarget.displayName || giftTarget.username}
          onClose={() => setGiftTarget(null)}
        />
      )}
      {tradeTarget && (
        <SendTradeModal
          counterpartyId={tradeTarget.userId}
          counterpartyName={tradeTarget.displayName || tradeTarget.username}
          onClose={() => setTradeTarget(null)}
        />
      )}
    </div>
  )
}

function ComposeFriendModal({ onClose, onSent }: { onClose: () => void; onSent: () => Promise<void> }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<UserHit | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [hits, setHits] = useState<UserHit[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleQueryChange = (val: string) => {
    setQuery(val)
    setSelected(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 2) { setHits([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await socialApi.searchUsers(val.trim(), 8)
        setHits(results)
      } catch {
        setHits([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  const pick = (hit: UserHit) => {
    setSelected(hit)
    setQuery(hit.username || hit.displayName)
    setHits([])
  }

  const submit = async () => {
    const target = selected?.username || query.trim()
    if (!target) return
    setSending(true)
    setError(null)
    try {
      await socialApi.sendRequest(target, message)
      await onSent()
      onClose()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? t('inbox.sendRequestFailed'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rpg-modal-backdrop" onClick={onClose}>
      <div
        className="rpg-modal rpg-panel rpg-panel--nailed"
        style={{ padding: 24, maxWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display" style={{ fontSize: 18, margin: '0 0 12px' }}>{t('inbox.addToCircle')}</h3>

        {/* Search field with typeahead */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={t('inbox.searchByName', { defaultValue: 'Search by name or username…' })}
            autoFocus
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '3px solid var(--ink-0)',
              background: 'var(--parch-0)',
              fontFamily: 'Pixelify Sans, monospace',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
          {(hits.length > 0 || searching) && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--parch-0)',
                border: '3px solid var(--ink-0)',
                borderTop: 'none',
                zIndex: 100,
                maxHeight: 220,
                overflowY: 'auto',
              }}
            >
              {searching && (
                <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--ink-2)' }}>
                  {t('common.searching', { defaultValue: 'Searching…' })}
                </div>
              )}
              {hits.map((hit) => (
                <div
                  key={hit.userId}
                  onClick={() => pick(hit)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: 'var(--parch-0)',
                    borderBottom: '1px solid var(--ink-3)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--parch-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--parch-0)')}
                >
                  {hit.avatarUrl ? (
                    <img src={hit.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: 2, border: '2px solid var(--ink-0)' }} />
                  ) : (
                    <div style={{ width: 28, height: 28, background: 'var(--moss-1)', border: '2px solid var(--ink-0)' }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {hit.displayName || hit.username}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--ink-2)' }}>@{hit.username}</div>
                  </div>
                  {hit.isFriend && (
                    <span className="rpg-badge rpg-badge--moss" style={{ fontSize: 9 }}>друг</span>
                  )}
                  {hit.requestSent && !hit.isFriend && (
                    <span className="rpg-badge" style={{ fontSize: 9 }}>отправлено</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('inbox.messageOptional')}
          rows={3}
          maxLength={280}
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '3px solid var(--ink-0)',
            background: 'var(--parch-0)',
            fontFamily: 'Pixelify Sans, monospace',
            fontSize: 12,
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        {error && (
          <div style={{ color: 'var(--rpg-danger, #a23a2a)', fontSize: 11, marginTop: 8 }}>{error}</div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <RpgButton size="sm" variant="ghost" onClick={onClose} disabled={sending}>{t('common.cancel')}</RpgButton>
          <RpgButton size="sm" variant="primary" onClick={() => void submit()} disabled={sending || (!query.trim() && !selected)}>
            {sending ? t('inbox.sending') : t('inbox.send')}
          </RpgButton>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: 32,
        textAlign: 'center',
        color: 'var(--ink-2)',
        fontSize: 13,
      }}
    >
      {label}
    </div>
  )
}

function ThreadRow({
  thread,
  active,
  onClick,
}: {
  thread: InboxThread
  active: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 14px',
        borderBottom: '1px dashed var(--ink-3)',
        cursor: 'pointer',
        background: active ? 'rgba(184,105,42,0.08)' : 'transparent',
        borderLeft: active ? '4px solid var(--ember-1)' : '4px solid transparent',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{thread.avatar}</span>
          <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 13 }}>{thread.subject}</div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {thread.unreadCount > 0 && (
            <span
              style={{
                background: 'var(--ember-1)',
                color: 'var(--parch-0)',
                border: '2px solid var(--ink-0)',
                fontFamily: 'Silkscreen, monospace',
                fontSize: 8,
                padding: '1px 5px',
                lineHeight: 1.5,
              }}
            >
              {thread.unreadCount}
            </span>
          )}
          <span
            className="font-silkscreen uppercase"
            style={{ fontSize: 8, color: 'var(--ink-2)', letterSpacing: '0.06em' }}
          >
            {relTime(thread.lastMessageAt)}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <span
          className="font-silkscreen uppercase"
          style={{
            fontSize: 7,
            color: KIND_COLOR[thread.kind],
            letterSpacing: '0.08em',
            flexShrink: 0,
            paddingTop: 2,
          }}
        >
          {KIND_LABEL[thread.kind]}
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--ink-2)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {thread.preview}
        </span>
      </div>
    </div>
  )
}

function ConversationHeader({ thread }: { thread: InboxThread }) {
  const { t } = useTranslation()
  return (
    <div
      style={{
        padding: '12px 18px',
        borderBottom: '2px solid var(--ink-0)',
        background: 'var(--parch-2)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 20 }}>{thread.avatar}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 15 }}>{thread.subject}</div>
        <div
          className="font-silkscreen uppercase"
          style={{ fontSize: 8, color: KIND_COLOR[thread.kind], letterSpacing: '0.08em' }}
        >
          {KIND_LABEL[thread.kind]}
        </div>
      </div>
      {thread.kind === ThreadKind.MENTOR && (
        <RpgButton size="sm" variant="ghost">
          {t('inbox.scheduleSession')}
        </RpgButton>
      )}
    </div>
  )
}

function MessageBubble({ msg, avatar }: { msg: InboxMessage; avatar: string }) {
  const { t } = useTranslation()
  const mine = msg.senderKind === SenderKind.USER
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: mine ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      {!mine && (
        <div
          style={{
            width: 32,
            height: 32,
            background: 'var(--ink-0)',
            color: 'var(--parch-0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Pixelify Sans, monospace',
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {avatar || msg.senderName.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div style={{ maxWidth: '72%' }}>
        {!mine && (
          <div
            className="font-silkscreen uppercase"
            style={{
              fontSize: 8,
              color: 'var(--ink-2)',
              letterSpacing: '0.08em',
              marginBottom: 3,
            }}
          >
            {msg.senderName} · {relTime(msg.createdAt)}
          </div>
        )}
        <div
          style={{
            padding: '10px 14px',
            background: mine ? 'var(--ember-1)' : 'var(--parch-2)',
            color: mine ? 'var(--parch-0)' : 'var(--ink-0)',
            border: '3px solid var(--ink-0)',
            boxShadow: mine ? '3px 3px 0 var(--ember-0)' : '3px 3px 0 var(--ink-0)',
            fontSize: 13,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {msg.body}
        </div>
        {mine && (
          <div
            className="font-silkscreen uppercase"
            style={{
              fontSize: 8,
              color: 'var(--ink-2)',
              letterSpacing: '0.08em',
              marginTop: 3,
              textAlign: 'right',
            }}
            >
            {t('inbox.youRelTime', { time: relTime(msg.createdAt) })}
          </div>
        )}
      </div>
    </div>
  )
}
