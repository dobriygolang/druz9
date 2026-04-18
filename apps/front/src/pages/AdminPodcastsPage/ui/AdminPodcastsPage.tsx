import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '@/features/Admin/api/adminApi'
import { Panel, RpgButton } from '@/shared/ui/pixel'

// Shape we rely on from /api/v1/podcasts. Only picking fields the admin
// table actually renders so schema drift on unused fields doesn't break
// the page.
interface AdminPodcast {
  id: string
  title: string
  description?: string
  mediaUrl?: string
  durationSeconds?: number
  status?: string
  createdAt?: string
}

export function AdminPodcastsPage() {
  const [rows, setRows] = useState<AdminPodcast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    setLoading(true)
    try {
      const data = (await adminApi.listAllPodcasts()) as AdminPodcast[]
      setRows(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'failed to load')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void reload() }, [])

  const del = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    try {
      await adminApi.deletePodcast(id)
      await reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'delete failed')
    }
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 className="font-display" style={{ fontSize: 22 }}>Podcasts admin</h1>
        <Link to="/podcasts"><RpgButton size="sm" variant="primary">Upload (via podcasts page)</RpgButton></Link>
      </div>
      {error && <div style={{ color: '#c85050' }}>{error}</div>}
      <Panel variant="recessed">
        {loading ? <div>Loading…</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--ink-2)' }}>
                <th style={{ padding: 6 }}>Title</th>
                <th style={{ padding: 6 }}>Status</th>
                <th style={{ padding: 6 }}>Duration</th>
                <th style={{ padding: 6 }}>Created</th>
                <th style={{ padding: 6 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--ink-3)' }}>
                  <td style={{ padding: 6 }}>{p.title}</td>
                  <td style={{ padding: 6 }}>{p.status ?? '—'}</td>
                  <td style={{ padding: 6 }}>{p.durationSeconds ? `${Math.round(p.durationSeconds / 60)}m` : '—'}</td>
                  <td style={{ padding: 6 }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: 6 }}>
                    <RpgButton size="sm" variant="ghost" onClick={() => del(p.id, p.title)}>Del</RpgButton>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr><td colSpan={5} style={{ padding: 12, textAlign: 'center', color: 'var(--ink-2)' }}>
                  No podcasts yet. Use the Upload button (opens /podcasts with the modal).
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  )
}
