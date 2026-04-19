// Admin → Users. Two utilities for now: trust/admin toggles and the new
// "grant currency" form. Both speak to the AdminService gRPC backend
// (gated by the admin selector in transport_auth.go).
import { useState } from 'react'
import { Panel, RpgButton, Badge, PageHeader } from '@/shared/ui/pixel'
import { adminApi } from '@/features/Admin/api/adminApi'

type Currency = 'gold' | 'gems' | 'shards'
const CURRENCY_LABEL: Record<Currency, string> = {
  gold: 'Gold ⚙',
  gems: 'Gems ◆',
  shards: 'Shards ✦',
}

export function AdminUsersPage() {
  return (
    <>
      <PageHeader
        eyebrow="admin · users"
        title="Users"
        subtitle="Поиск пользователя, управление флагами доступа и выдача валюты."
      />
      <GrantCurrencyForm />
    </>
  )
}

function GrantCurrencyForm() {
  const [userId, setUserId] = useState('')
  const [currency, setCurrency] = useState<Currency>('gold')
  const [amount, setAmount] = useState('100')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const onSubmit = async () => {
    setBusy(true)
    setResult(null)
    const n = parseInt(amount, 10)
    if (!Number.isFinite(n) || n <= 0) {
      setResult({ kind: 'err', text: 'Сумма должна быть положительным целым' })
      setBusy(false)
      return
    }
    try {
      await adminApi.grantCurrency(userId.trim(), currency, n, reason.trim())
      setResult({ kind: 'ok', text: `+${n} ${currency} зачислено пользователю ${userId.trim()}` })
      setAmount('100')
      setReason('')
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })
      setResult({ kind: 'err', text: msg.response?.data?.message ?? msg.message ?? 'Ошибка' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel style={{ marginBottom: 16, padding: 16 }}>
      <div className="font-display" style={{ fontSize: 16, marginBottom: 6 }}>Выдача валюты</div>
      <div style={{ color: 'var(--ink-2)', fontSize: 12, marginBottom: 14 }}>
        Кредитует кошелёк пользователя. Сумма уходит в ledger с типом{' '}
        <code>admin</code> и причиной — данные потом видны в аудите.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px', gap: 8, marginBottom: 10 }}>
        <Field label="user_id (UUID)">
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            style={inputStyle}
          />
        </Field>
        <Field label="Валюта">
          <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} style={inputStyle}>
            {(['gold', 'gems', 'shards'] as Currency[]).map((c) => (
              <option key={c} value={c}>{CURRENCY_LABEL[c]}</option>
            ))}
          </select>
        </Field>
        <Field label="Сумма">
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={inputStyle}
          />
        </Field>
      </div>

      <Field label="Причина (для аудита)">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="например: компенсация за инцидент SUP-1234"
          style={inputStyle}
        />
      </Field>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
        <RpgButton size="sm" variant="primary" onClick={onSubmit} disabled={busy || !userId.trim()}>
          {busy ? 'Кредитуем…' : 'Выдать'}
        </RpgButton>
        {result && (
          <Badge variant={result.kind === 'ok' ? 'moss' : 'ember'} style={{ fontSize: 11 }}>
            {result.text}
          </Badge>
        )}
      </div>
    </Panel>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>
        {label}
      </span>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '3px solid var(--ink-0)',
  background: 'var(--parch-0)',
  fontFamily: 'IBM Plex Sans, system-ui',
  color: 'var(--ink-0)',
  outline: 'none',
  boxShadow: 'inset 2px 2px 0 var(--parch-3)',
}
