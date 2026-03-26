import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { Compass, Users, Calendar, MapPin, User as UserIcon, LogOut, Briefcase, Video } from 'lucide-react';
import { geoApi } from '@/features/Geo/api/geoApi';

export const Sidebar: React.FC = () => {
  const { logout } = useAuth();
  const [userCount, setUserCount] = useState<number | null>(null);
  const [points, setPoints] = useState<any[]>([]);

  useEffect(() => {
    const fetchPoints = () => {
      geoApi.communityMap()
        .then(data => {
          setPoints(data);
          setUserCount(data.length);
        })
        .catch(err => console.error('Failed to fetch user count', err));
    };

    fetchPoints();
    const interval = setInterval(fetchPoints, 30000);
    return () => clearInterval(interval);
  }, []);

  const actualOnlineCount = points.filter(p => p.activityStatus === 'online').length;

  return (
    <aside className="sidebar-desktop">
      <div style={{ marginBottom: '40px', paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontWeight: '700', fontSize: '20px', letterSpacing: '1px' }}>Друзья</div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '6px' }}>v1.0</span>
        </div>
        {userCount !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)', animation: 'pulse 2s infinite' }} />
              <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{Math.max(actualOnlineCount, 1)} online</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '16px' }}>
              {userCount} {userCount === 1 ? 'участник' : 'участников'}
            </div>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <NavItem to="/feed" icon={<Compass size={20} />} label="Подкаст" />
        <NavItem to="/users" icon={<Users size={20} />} label="Пользователи" />
        <NavItem to="/events" icon={<Calendar size={20} />} label="Ивент" />
        <NavItem to="/vacancies" icon={<Briefcase size={20} />} label="Вакансии" />
        <NavItem to="/rooms" icon={<Video size={20} />} label="Комнаты" />
        <NavItem to="/map" icon={<MapPin size={20} />} label="Карта" />
        <div style={{ height: '32px' }} />
        <NavItem to="/profile" icon={<UserIcon size={20} />} label="Профиль" />
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '12px',
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: 'none',
            padding: '12px',
            cursor: 'pointer',
            width: '100%',
            minHeight: '44px',
            borderRadius: '12px',
            textAlign: 'left',
            fontSize: '14px',
            fontWeight: '500',
            lineHeight: 1.2,
            transition: 'transform 0.2s, background-color 0.2s, color 0.2s',
            appearance: 'none',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--surface-color)';
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <LogOut size={20} style={{ flexShrink: 0 }} />
          <span style={{ display: 'block' }}>Выйти</span>
        </button>
      </div>
    </aside>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; to: string }> = ({ icon, label, to }) => (
  <NavLink to={to} style={({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px',
    color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
    backgroundColor: isActive ? 'var(--surface-color)' : 'transparent',
    textDecoration: 'none', transition: 'background 0.2s', fontSize: '14px', fontWeight: isActive ? '600' : '500'
  })}>
    {icon} <span>{label}</span>
  </NavLink>
);
