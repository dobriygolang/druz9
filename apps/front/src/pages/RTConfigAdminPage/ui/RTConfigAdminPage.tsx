import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Lock, RefreshCw, Save, Search, Settings, Unlock } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { useRuntimeConfig } from '@/app/providers/RuntimeConfigProvider';
import { adminApi, ConfigItem } from '@/features/Admin/api/adminApi';

export const RTConfigAdminPage: React.FC = () => {
  const { user } = useAuth();
  const { refresh: refreshRuntimeConfig } = useRuntimeConfig();
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
      data.forEach((c) => { values[c.key] = c.value; });
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
      await refreshRuntimeConfig();
    } catch (err) {
      setError('Не удалось сохранить конфиг');
      console.error(err);
    } finally {
      setSavingKey(null);
    }
  };

  const groups = Array.from(new Set(configs.map((c) => c.group).filter(Boolean)));

  const filteredConfigs = configs.filter((c) => {
    const matchesSearch =
      searchQuery === '' ||
      c.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.usage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = filterGroup === '' || c.group === filterGroup;
    return matchesSearch && matchesGroup;
  });

  if (!isAdmin) {
    return <Navigate to="/practice/code-rooms" replace />;
  }

  return (
    <div className="admin-page fade-in">
      {/* Header */}
      <div className="admin-page__header">
        <div className="admin-page__header-left">
          <div className="admin-page__icon" style={{ background: 'rgba(100,116,139,0.1)', color: '#64748b' }}>
            <Settings size={22} />
          </div>
          <div>
            <h1 className="admin-page__title">Конфигурация</h1>
            <p className="admin-page__subtitle">Runtime-параметры приложения</p>
          </div>
        </div>
        <button
          className="btn btn-secondary admin-page__refresh-btn"
          onClick={() => void loadConfigs()}
        >
          <RefreshCw size={16} />
          Обновить
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}
          />
          <input
            type="text"
            className="input"
            placeholder="Поиск по ключу или описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '42px', height: '40px' }}
          />
        </div>
        <select
          className="input"
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          style={{ width: '180px', height: '40px' }}
        >
          <option value="">Все группы</option>
          {groups.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="admin-page__error">{error}</div>
      )}

      {/* Config list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Загрузка...</div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {filteredConfigs.map((config) => (
            <div
              key={config.key}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                padding: '16px 20px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                transition: 'box-shadow 0.15s',
              }}
            >
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <code style={{ fontWeight: 700, color: '#6366f1', fontSize: 14 }}>{config.key}</code>
                  {config.writable ? (
                    <span title="Можно изменять"><Unlock size={13} color="#16a34a" /></span>
                  ) : (
                    <span title="Только чтение"><Lock size={13} color="#f59e0b" /></span>
                  )}
                  <span
                    style={{
                      marginLeft: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '1px 7px',
                      borderRadius: 6,
                      background: '#f1f5f9',
                      color: '#64748b',
                    }}
                  >
                    {config.group || 'общее'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#475569', marginBottom: 4, lineHeight: 1.4 }}>
                  {config.usage}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  Тип: <strong>{config.type}</strong>
                </div>
              </div>

              {/* Input + Save */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <input
                  type="text"
                  className="input"
                  value={editValues[config.key] ?? ''}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, [config.key]: e.target.value }))}
                  disabled={!config.writable}
                  style={{
                    width: '200px',
                    height: '38px',
                    background: config.writable ? '#f8fafc' : '#f1f5f9',
                    color: config.writable ? 'var(--text-primary)' : '#94a3b8',
                    border: '1px solid #e2e8f0',
                  }}
                />
                {config.writable && (
                  <button
                    className="btn btn-primary"
                    onClick={() => void handleSave(config.key)}
                    disabled={savingKey === config.key || editValues[config.key] === config.value}
                    style={{ height: '38px', padding: '0 14px' }}
                  >
                    {savingKey === config.key ? (
                      <RefreshCw size={15} className="spin" />
                    ) : (
                      <Save size={15} />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredConfigs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
              Конфиги не найдены
            </div>
          )}
        </div>
      )}
    </div>
  );
};
