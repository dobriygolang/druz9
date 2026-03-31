import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Settings, Save, RefreshCw, Lock, Unlock, Search } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { adminApi, ConfigItem } from '@/features/Admin/api/adminApi';

export const RTConfigAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('');
  const [error, setError] = useState('');

  const isAdmin = Boolean(user?.isAdmin);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.listConfig();
      setConfigs(data);
      const values: Record<string, string> = {};
      data.forEach(c => { values[c.key] = c.value; });
      setEditValues(values);
    } catch (err) {
      setError('Не удалось загрузить конфиги');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  const handleSave = async (key: string) => {
    setSavingKey(key);
    try {
      await adminApi.updateConfig(key, editValues[key]);
      await loadConfigs();
    } catch (err) {
      setError('Не удалось сохранить конфиг');
      console.error(err);
    } finally {
      setSavingKey(null);
    }
  };

  const groups = Array.from(new Set(configs.map(c => c.group).filter(Boolean)));

  const filteredConfigs = configs.filter(c => {
    const matchesSearch = searchQuery === '' ||
      c.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.usage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = filterGroup === '' || c.group === filterGroup;
    return matchesSearch && matchesGroup;
  });

  if (!isAdmin) {
    return <Navigate to="/code-rooms" replace />;
  }

  return (
    <div className="fade-in" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Settings size={28} />
          Конфигурация
        </h1>
        <button
          onClick={() => void loadConfigs()}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={16} />
          Обновить
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Поиск по ключу или описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '48px', height: '48px' }}
          />
        </div>
        <select
          className="input"
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          style={{ width: '200px', height: '48px' }}
        >
          <option value="">Все группы</option>
          {groups.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', marginBottom: '16px', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Загрузка...</div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {filteredConfigs.map(config => (
            <div
              key={config.key}
              className="card"
              style={{
                padding: '16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <code style={{ fontWeight: '600', color: 'var(--accent-color)' }}>{config.key}</code>
                    {config.writable ? (
                      <Unlock size={14} color="#10B981" title="Можно изменять" />
                    ) : (
                      <Lock size={14} color="#f59e0b" title="Только чтение" />
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {config.usage}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Тип: {config.type} | Группа: {config.group || '-'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    className="input"
                    value={editValues[config.key] ?? ''}
                    onChange={(e) => setEditValues(prev => ({ ...prev, [config.key]: e.target.value }))}
                    disabled={!config.writable}
                    style={{
                      width: '200px',
                      height: '40px',
                      backgroundColor: config.writable ? '#1E1E1E' : '#151515',
                    }}
                  />
                  {config.writable && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleSave(config.key)}
                      disabled={savingKey === config.key || editValues[config.key] === config.value}
                      style={{ height: '40px', padding: '0 16px' }}
                    >
                      {savingKey === config.key ? (
                        <RefreshCw size={16} className="spin" />
                      ) : (
                        <Save size={16} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};