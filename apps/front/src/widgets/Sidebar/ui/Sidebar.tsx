import React, { useEffect, useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { Compass, Users, Calendar, MapPin, User as UserIcon, LogOut, Briefcase, Code2, ArrowRight, Settings, Shield, BookOpen } from 'lucide-react';
import { geoApi } from '@/features/Geo/api/geoApi';
import { CommunityMapPoint } from '@/entities/User/model/types';

export const Sidebar: React.FC = () => {
  const { logout, isAuthenticated, user } = useAuth();
  const [userCount, setUserCount] = useState<number | null>(null);
  const [points, setPoints] = useState<CommunityMapPoint[]>([]);

  const fetchPointsRef = useRef<() => void>(() => {});

  useEffect(() => {
    const fetchPoints = () => {
      geoApi.communityMap()
        .then(data => {
          setPoints(data);
          setUserCount(data.length);
        })
        .catch(err => console.error('Failed to fetch user count', err));
    };

    fetchPointsRef.current = fetchPoints;
    fetchPoints();
    const interval = setInterval(() => fetchPointsRef.current(), 30000);
    return () => clearInterval(interval);
  }, []);

  const actualOnlineCount = points.filter(p => p.activityStatus === 'online').length;

  return (
    <aside className="sidebar-desktop">
      <div className="sidebar-desktop__brand">
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

      <nav className="sidebar-desktop__nav">
        <NavItem to="/code-rooms" icon={<Code2 size={20} />} label="Код" />
        {isAuthenticated ? (
          <>
            <NavItem to="/feed" icon={<Compass size={20} />} label="Подкаст" />
            <NavItem to="/users" icon={<Users size={20} />} label="Пользователи" />
            <NavItem to="/events" icon={<Calendar size={20} />} label="Ивент" />
            <NavItem to="/vacancies" icon={<Briefcase size={20} />} label="Вакансии" />
            <NavItem to="/map" icon={<MapPin size={20} />} label="Карта" />
            {user?.isTrusted && <NavItem to="/interview-prep" icon={<BookOpen size={20} />} label="Go Prep" />}
            <div style={{ height: '32px' }} />
            {user?.isAdmin && (
              <>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', padding: '0 12px', marginBottom: '4px' }}>
                  Админ
                </div>
                <NavItem to="/admin/config" icon={<Settings size={20} />} label="Конфиг" />
                <NavItem to="/admin/code-tasks" icon={<Shield size={20} />} label="Задачи" />
                <NavItem to="/admin/interview-prep" icon={<Shield size={20} />} label="Interview Prep" />
                <div style={{ height: '16px' }} />
              </>
            )}
            <NavItem to="/profile" icon={<UserIcon size={20} />} label="Профиль" />
          </>
        ) : (
          <>
            <div
              style={{
                marginTop: '12px',
                padding: '16px',
                borderRadius: '18px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'linear-gradient(180deg, rgba(93, 76, 229, 0.16) 0%, rgba(255,255,255,0.04) 100%)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                Зарегистрируйся и попади в рейтинг arena
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Сохраняй ELO, попадай в лидерборд, открывай профиль и играй без гостевых ограничений.
              </div>
              <NavLink
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  minHeight: '44px',
                  padding: '0 14px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  background: 'var(--accent-color)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                <span>Войти и зарегистрироваться</span>
                <ArrowRight size={16} />
              </NavLink>
            </div>
            <div style={{ height: '20px' }} />
            <NavItem to="/login" icon={<UserIcon size={20} />} label="Войти" />
          </>
        )}
      </nav>

      {isAuthenticated && (
        <div className="sidebar-desktop__footer">
          <button
            onClick={logout}
            aria-label="Выйти"
            className="sidebar-desktop__logout"
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
      )}
    </aside>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; to: string }> = ({ icon, label, to }) => (
  <NavLink to={to} className="sidebar-desktop__nav-item" style={({ isActive }) => ({
    color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
    backgroundColor: isActive ? 'var(--surface-color)' : 'transparent',
    fontWeight: isActive ? '600' : '500'
  })}>
    {icon} <span>{label}</span>
  </NavLink>
);
