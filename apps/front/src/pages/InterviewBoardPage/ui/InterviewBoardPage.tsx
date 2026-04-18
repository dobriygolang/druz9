import { useEffect, useState } from 'react'
import { PageHeader, Panel, RpgButton, Badge } from '@/shared/ui/pixel'
import {
  interviewPrepApi,
  type InterviewExperience,
  type InterviewExperienceDraft,
} from '@/features/InterviewPrep/api/interviewPrepApi'

const COMPANIES = ['', 'yandex', 'ozon', 'avito', 'vk', 'tinkoff', 'google', 'amazon', 'meta']
const LEVELS = ['junior', 'mid', 'senior', 'staff']

export function InterviewBoardPage() {
  const [company, setCompany] = useState('')
  const [items, setItems] = useState<InterviewExperience[]>([])
  const [postOpen, setPostOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    setLoading(true)
    try {
      const r = await interviewPrepApi.listExperiences(company)
      setItems(r.experiences)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void reload() }, [company])

  return (
    <>
      <PageHeader
        eyebrow="Interview board"
        title="Anonymous interview experiences"
        subtitle="Real loop structures, questions, and feedback from people who've been through it."
        right={<RpgButton size="sm" variant="primary" onClick={() => setPostOpen(true)}>Share your experience</RpgButton>}
      />

      <div style={{ marginBottom: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {COMPANIES.map((c) => (
          <RpgButton key={c || 'all'} size="sm" variant={company === c ? 'primary' : 'default'} onClick={() => setCompany(c)}>
            {c || 'All'}
          </RpgButton>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--ink-2)' }}>Loading…</div>
      ) : items.length === 0 ? (
        <Panel><div style={{ padding: 18, textAlign: 'center', color: 'var(--ink-2)' }}>
          No posts yet for this company. Be the first to share.
        </div></Panel>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((e) => <ExperienceCard key={e.id} e={e} />)}
        </div>
      )}

      {postOpen && (
        <PostExperienceModal
          onClose={() => setPostOpen(false)}
          onPosted={() => { setPostOpen(false); void reload() }}
        />
      )}
    </>
  )
}

function ExperienceCard({ e }: { e: InterviewExperience }) {
  return (
    <Panel>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <div>
          <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 15 }}>
            {e.companyTag.toUpperCase()} · {e.role || 'role n/a'} · {e.level || 'level n/a'}
          </div>
          <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>
            {new Date(e.postedAt).toLocaleDateString()} · {e.isAnonymous ? 'anonymous' : 'named'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Badge>{'★'.repeat(e.overallRating)}</Badge>
          {e.outcome && <Badge variant="dark">{e.outcome}</Badge>}
        </div>
      </div>
      {e.loopStructure && <Section label="Loop structure">{e.loopStructure}</Section>}
      {e.questions && <Section label="Questions asked">{e.questions}</Section>}
      {e.feedbackReceived && <Section label="Feedback received">{e.feedbackReceived}</Section>}
    </Panel>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{children}</div>
    </div>
  )
}

function PostExperienceModal({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const [draft, setDraft] = useState<InterviewExperienceDraft>({
    companyTag: 'yandex',
    role: 'Software Engineer',
    level: 'mid',
    overallRating: 4,
    loopStructure: '',
    questions: '',
    feedbackReceived: '',
    outcome: 'pending',
    isAnonymous: true,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await interviewPrepApi.postExperience(draft)
      onPosted()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'post failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rpg-modal-backdrop" onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, width: '92%' }}>
        <Panel style={{ padding: 18 }}>
          <h2 className="font-display" style={{ fontSize: 18, marginBottom: 12 }}>Share your interview</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="Company">
              <select value={draft.companyTag} onChange={(e) => setDraft({ ...draft, companyTag: e.target.value })}>
                {COMPANIES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Role"><input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} /></Field>
            <Field label="Level">
              <select value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value })}>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Rating 1-5"><input type="number" min={1} max={5} value={draft.overallRating} onChange={(e) => setDraft({ ...draft, overallRating: Number(e.target.value) })} /></Field>
            <Field label="Outcome">
              <select value={draft.outcome} onChange={(e) => setDraft({ ...draft, outcome: e.target.value })}>
                <option value="pending">pending</option>
                <option value="offer">offer</option>
                <option value="no-offer">no-offer</option>
                <option value="withdrew">withdrew</option>
              </select>
            </Field>
            <Field label="Anonymous">
              <input type="checkbox" checked={draft.isAnonymous} onChange={(e) => setDraft({ ...draft, isAnonymous: e.target.checked })} />
            </Field>
          </div>
          <Field label="Loop structure (round 1 screener, round 2 system design, …)">
            <textarea rows={3} value={draft.loopStructure} onChange={(e) => setDraft({ ...draft, loopStructure: e.target.value })} style={{ width: '100%' }} />
          </Field>
          <Field label="Questions asked (no NDAs — only share what's fair game)">
            <textarea rows={4} value={draft.questions} onChange={(e) => setDraft({ ...draft, questions: e.target.value })} style={{ width: '100%' }} />
          </Field>
          <Field label="Feedback received">
            <textarea rows={3} value={draft.feedbackReceived} onChange={(e) => setDraft({ ...draft, feedbackReceived: e.target.value })} style={{ width: '100%' }} />
          </Field>
          {error && <div style={{ color: '#c85050' }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <RpgButton size="sm" variant="ghost" onClick={onClose}>Cancel</RpgButton>
            <RpgButton size="sm" variant="primary" disabled={busy} onClick={submit}>{busy ? 'Posting…' : 'Post'}</RpgButton>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, marginTop: 8 }}>
      <span className="font-silkscreen uppercase" style={{ color: 'var(--ink-2)', letterSpacing: '0.1em', fontSize: 10 }}>{label}</span>
      {children}
    </label>
  )
}
