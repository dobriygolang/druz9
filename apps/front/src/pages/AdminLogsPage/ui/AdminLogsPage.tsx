import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Server, TerminalSquare } from 'lucide-react'
import { adminApi, type DockerLogsResponse } from '@/features/Admin/api/adminApi'
import { Button } from '@/shared/ui/Button'
import { PageMeta } from '@/shared/ui/PageMeta'

const FALLBACK_SERVICES = [
  'backend',
  'frontend',
  'notification-service',
  'postgres',
  'minio',
  'sandbox-runner',
  'prometheus',
  'grafana',
  'alertmanager',
  'postgres-exporter',
  'node-exporter',
  'seed',
  'minio-init',
]

const TAIL_OPTIONS = [100, 300, 1000, 2500, 5000]

function formatLogLine(line: string) {
  const firstSpace = line.indexOf(' ')
  if (firstSpace <= 0) return { time: '', text: line }
  const time = line.slice(0, firstSpace)
  const text = line.slice(firstSpace + 1)
  if (!/^\d{4}-\d{2}-\d{2}T/.test(time)) return { time: '', text: line }
  return { time, text }
}

export function AdminLogsPage() {
  const [service, setService] = useState('backend')
  const [tail, setTail] = useState(300)
  const [since, setSince] = useState('')
  const [response, setResponse] = useState<DockerLogsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const services = useMemo(() => {
    const fromApi = response?.availableServices ?? []
    return Array.from(new Set([...fromApi, ...FALLBACK_SERVICES])).sort()
  }, [response?.availableServices])

  const lines = useMemo(() => {
    const raw = response?.logs ?? ''
    return raw.split('\n').filter((line) => line.trim().length > 0)
  }, [response?.logs])

  const loadLogs = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminApi.getDockerLogs({ service, tail, since: since.trim() })
      setResponse(data)
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Не удалось получить логи. Проверь docker socket на backend контейнере.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-6">
      <PageMeta title="Docker logs" description="Admin viewer for Docker container logs." />

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase text-[#4B6B52]">
            <TerminalSquare className="h-4 w-4 text-[#059669]" />
            Observability
          </div>
          <h1 className="text-xl font-bold text-[#0B1210]">Docker logs</h1>
          <p className="mt-0.5 text-sm text-[#4B6B52]">
            Быстрый просмотр хвоста логов production compose-сервисов без SSH в контейнер.
          </p>
        </div>

        <Button variant="orange" onClick={loadLogs} loading={loading}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_220px]">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#4B6B52]">
          Service
          <select
            value={service}
            onChange={(event) => setService(event.target.value)}
            className="h-10 rounded-lg border border-[#C1CFC4] bg-white px-3 text-sm font-medium text-[#0B1210] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20"
          >
            {services.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-[#4B6B52]">
          Tail
          <select
            value={tail}
            onChange={(event) => setTail(Number(event.target.value))}
            className="h-10 rounded-lg border border-[#C1CFC4] bg-white px-3 text-sm font-medium text-[#0B1210] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20"
          >
            {TAIL_OPTIONS.map((item) => (
              <option key={item} value={item}>{item} lines</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-[#4B6B52]">
          Since
          <input
            value={since}
            onChange={(event) => setSince(event.target.value)}
            placeholder="10m, 2h, 2026-04-18T10:00:00"
            className="h-10 rounded-lg border border-[#C1CFC4] bg-white px-3 text-sm font-medium text-[#0B1210] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20"
          />
        </label>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-[#4B6B52]">
        <span className="inline-flex items-center gap-1">
          <Server className="h-3.5 w-3.5" />
          {response?.containerId ? `container ${response.containerId}` : 'container pending'}
        </span>
        <span>{lines.length} visible lines</span>
        <span>tail {response?.tail ?? tail}</span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      <div className="min-h-[520px] overflow-hidden rounded-lg border border-[#18251f] bg-[#07110d] shadow-sm">
        <div className="flex items-center justify-between border-b border-[#183027] bg-[#0d1b15] px-4 py-2">
          <span className="font-mono text-xs font-semibold text-[#D1FAE5]">{service}</span>
          <span className="font-mono text-xs text-[#7BA88A]">{loading ? 'loading...' : 'docker logs --timestamps'}</span>
        </div>
        <div className="max-h-[640px] overflow-auto p-0 font-mono text-xs leading-5">
          {loading && lines.length === 0 ? (
            <div className="px-4 py-6 font-sans text-sm text-[#9CA3AF]">Загружаю логи...</div>
          ) : lines.length === 0 ? (
            <div className="px-4 py-6 font-sans text-sm text-[#9CA3AF]">Логов по выбранному фильтру нет.</div>
          ) : (
            lines.map((line, index) => {
              const { time, text } = formatLogLine(line)
              return (
                <div key={`${index}-${line.slice(0, 24)}`} className="grid grid-cols-[220px_1fr] gap-3 border-b border-white/5 px-4 py-1 hover:bg-white/[0.03]">
                  <span className="select-none text-[#6EE7B7]">{time}</span>
                  <code className="whitespace-pre-wrap break-words text-[#E5E7EB]">{text}</code>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
