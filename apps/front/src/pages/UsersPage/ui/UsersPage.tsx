import React, { useEffect, useState, useRef } from 'react';
import { Search, User as UserIcon, MapPin, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { geoApi } from '@/features/Geo/api/geoApi';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { CommunityMapPoint } from '@/entities/User/model/types';
import { ArenaPlayerStats } from '@/entities/CodeRoom/model/types';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<CommunityMapPoint[]>([]);
  const [arenaStatsByUserId, setArenaStatsByUserId] = useState<Record<string, ArenaPlayerStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const loadUsersRef = useRef<{ (initial?: boolean): Promise<void> } | null>(null);

  const loadUsers = async (initial = false) => {
    try {
      if (initial) setIsLoading(true);
      const data = await geoApi.communityMap();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      if (initial) setIsLoading(false);
    }
  };

  loadUsersRef.current = loadUsers;

  useEffect(() => {
    void loadUsers(true);
    const interval = setInterval(() => loadUsersRef.current?.(false), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (users.length === 0) {
      setArenaStatsByUserId({});
      return;
    }

    let cancelled = false;

    const loadArenaStats = async () => {
      // Use batch endpoint to fetch all stats in a single request (O(1) instead of O(n))
      const userIds = users.map(u => u.userId);
      const statsMap = await codeRoomApi.getArenaStatsBatch(userIds);

      if (!cancelled) {
        setArenaStatsByUserId(statsMap);
      }
    };

    void loadArenaStats();

    return () => {
      cancelled = true;
    };
  }, [users]);

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    return (
      fullName.includes(searchLower) ||
      user.username.toLowerCase().includes(searchLower) ||
      user.region.toLowerCase().includes(searchLower) ||
      user.title.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '600' }}>Пользователи</h1>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Всего: <strong style={{ color: 'var(--text-primary)' }}>{users.length}</strong>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '32px' }}>
        <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        <input
          type="text"
          className="input"
          placeholder="Поиск по имени, тегу или городу..."
          aria-label="Поиск пользователей"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '48px', height: '52px', fontSize: '16px', backgroundColor: '#1E1E1E', border: 'none', borderRadius: '16px' }}
        />
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Загрузка списка пользователей...</div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <Link 
                key={user.userId} 
                to={`/profile/${user.userId}`} 
                className="card hover-opacity"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px', 
                  padding: '16px', 
                  textDecoration: 'none', 
                  color: 'inherit',
                  transition: 'transform 0.2s, background-color 0.2s',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ 
                  width: '52px', 
                  height: '52px', 
                  borderRadius: '50%', 
                  overflow: 'hidden', 
                  background: 'var(--bg-color)',
                  flexShrink: 0,
                  border: '2px solid rgba(255,255,255,0.1)'
                }}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#333' }}>
                      <UserIcon size={24} color="#888" />
                    </div>
                  )}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {user.firstName} {user.lastName}
                    {user.isCurrentUser && (
                      <span style={{ fontSize: '10px', background: 'var(--accent-color)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Вы</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--accent-color)' }}>@{user.username}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} /> {user.region}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--warning-color, #f4c95d)' }}>
                      {arenaStatsByUserId[user.userId]?.rating ?? 1000} ELO
                    </span>
                  </div>
                </div>

                <ChevronRight size={20} color="#444" />
              </Link>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Никого не найдено</div>
          )}
        </div>
      )}
    </div>
  );
};
