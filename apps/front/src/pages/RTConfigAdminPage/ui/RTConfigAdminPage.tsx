import { useEffect, useState } from 'react'
import { Save, RefreshCw } from 'lucide-react'
import { adminApi } from '@/features/Admin/api/adminApi'
import { Button } from '@/shared/ui/Button'
import { Toggle } from '@/shared/ui/Toggle'
import { Input } from '@/shared/ui/Input'

export function RTConfigAdminPage() {
  const [config, setConfig] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    adminApi.getConfig()
      .then((c: any) => setConfig(c ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await Promise.all(Object.entries(config).map(([key, value]) => adminApi.updateConfig(key, value)))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {} finally { setSaving(false) }
  }

  const setBool = (key: string, val: boolean) => setConfig(c => ({ ...c, [key]: val }))
  const setVal = (key: string, val: string) => setConfig(c => ({ ...c, [key]: val }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#0B1210]">Config</h1>
          <p className="text-sm text-[#4B6B52] mt-0.5">Application settings</p>
        </div>
        <Button variant="orange" onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save'}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-[#94a3b8] animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Auth section */}
          <div className="bg-white rounded-xl border border-[#C1CFC4] p-5">
            <h2 className="text-sm font-semibold text-[#0B1210] mb-4">Authentication</h2>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#0B1210]">Require authentication</p>
                  <p className="text-xs text-[#4B6B52] mt-0.5">All pages require sign-in</p>
                </div>
                <Toggle
                  checked={config.app_require_auth ?? false}
                  onChange={v => setBool('app_require_auth', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#0B1210]">Arena requires authentication</p>
                  <p className="text-xs text-[#4B6B52] mt-0.5">Arena matches are available only to signed-in users</p>
                </div>
                <Toggle
                  checked={config.arena_require_auth ?? false}
                  onChange={v => setBool('arena_require_auth', v)}
                />
              </div>
            </div>
          </div>

          {/* Feature flags */}
          <div className="bg-white rounded-xl border border-[#C1CFC4] p-5">
            <h2 className="text-sm font-semibold text-[#0B1210] mb-4">Feature Flags</h2>
            <div className="flex flex-col gap-4">
              {['enable_podcasts', 'enable_arena', 'enable_mock_interviews', 'enable_community_map'].map(key => (
                <div key={key} className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#0B1210] font-mono">{key}</p>
                  <Toggle
                    checked={config[key] ?? false}
                    onChange={v => setBool(key, v)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Other config */}
          {Object.entries(config).filter(([k]) => !['app_require_auth', 'arena_require_auth', 'enable_podcasts', 'enable_arena', 'enable_mock_interviews', 'enable_community_map'].includes(k) && typeof config[k] === 'string').length > 0 && (
            <div className="bg-white rounded-xl border border-[#C1CFC4] p-5">
              <h2 className="text-sm font-semibold text-[#0B1210] mb-4">Other settings</h2>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(config).filter(([, v]) => typeof v === 'string').map(([key, value]) => (
                  <Input key={key} label={key} value={String(value)} onChange={e => setVal(key, e.target.value)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
