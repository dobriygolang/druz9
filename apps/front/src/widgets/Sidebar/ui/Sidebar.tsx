import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { geoApi } from '@/features/Geo/api/geoApi';
import {
  ArrowRight,
  BarChart2,
  Code2,
  Headphones,
  Home,
  LogOut,
  Settings,
  Shield,
  Sparkles,
  Sword,
  User as UserIcon,
  Users,
} from 'lucide-react';

interface SidebarProps {
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isAdmin = false }) => {
  const { logout, isAuthenticated, user } = useAuth();
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setOnlineCount(null);
      return;
    }

    let cancelled = false;
    void geoApi.communityMap().then((points) => {
      if (cancelled) return;
      setOnlineCount(points.filter((point) => point.activityStatus === 'online').length);
    }).catch((error) => {
      console.error('Failed to load online community count:', error);
    });

    return () => { cancelled = true; };
  }, [isAuthenticated]);

  /* ── colour tokens depending on context ── */
  const textPrimary  = isAdmin ? '#0f172a' : 'var(--text-primary)';
  const textSecondary = isAdmin ? '#64748b' : 'var(--text-secondary)';
  const bgSurface    = isAdmin ? '#f1f5f9' : 'var(--surface-color)';
  const accentColor  = '#6366f1';

  return (
    <aside className={`sidebar-desktop${isAdmin ? ' sidebar-desktop--admin' : ''}`}>
      <div className="sidebar-desktop__brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontWeight: '700', fontSize: '20px', letterSpacing: '1px', color: textPrimary }}>
            Друзья
          </div>
          <span style={{
            fontSize: '11px',
            color: textSecondary,
            fontWeight: '500',
            background: isAdmin ? '#f1f5f9' : 'rgba(255,255,255,0.05)',
            padding: '2px 6px',
            borderRadius: '6px',
          }}>
            v1.5.2
          </span>
        </div>
        {isAuthenticated && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)', animation: 'pulse 2s infinite' }} />
              <span style={{ color: textPrimary, fontWeight: '600' }}>
                {onlineCount !== null ? `${onlineCount} онлайн` : (user?.activityStatus === 'online' ? 'Вы онлайн' : 'Аккаунт активен')}
              </span>
            </div>
          </div>
        )}
      </div>

      <nav className="sidebar-desktop__nav">
        {isAuthenticated ? (
          <>
            {!isAdmin && (
              <>
                <NavItem to="/home" icon={<Home size={20} />} label="Home" isAdmin={isAdmin} />
                <NavItem to="/community/people" icon={<Users size={20} />} label="Community" isAdmin={isAdmin} />
                <NavItem to="/practice/code-rooms" icon={<Code2 size={20} />} label="Practice" isAdmin={isAdmin} />
                <NavItem to="/growth/interview-prep" icon={<Sparkles size={20} />} label="Growth" isAdmin={isAdmin} />
                <div style={{ height: '32px' }} />
              </>
            )}

            {isAdmin && (
              <>
                {/* Back to app */}
                <NavItem to="/home" icon={<ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />} label="К приложению" isAdmin={isAdmin} />
                <div style={{ height: '8px' }} />

                {/* Admin nav sections */}
                <div className="sidebar-section-title" style={{ color: textSecondary }}>УПРАВЛЕНИЕ</div>
                <NavItem to="/admin/code-tasks" icon={<Code2 size={20} />} label="Code Tasks" isAdmin={isAdmin} />
                <NavItem to="/admin/code-game" icon={<Sword size={20} />} label="Code Game" isAdmin={isAdmin} />
                <NavItem to="/admin/interview-prep" icon={<Shield size={20} />} label="Interview Prep" isAdmin={isAdmin} />
                <NavItem to="/admin/config" icon={<Settings size={20} />} label="Config" isAdmin={isAdmin} />
                <div style={{ height: '8px' }} />
                <div className="sidebar-section-title" style={{ color: textSecondary }}>СТАТИСТИКА</div>
                <NavItem to="/admin/analytics" icon={<BarChart2 size={20} />} label="Analytics" isAdmin={isAdmin} />
              </>
            )}

            {!isAdmin && user?.isAdmin && (
              <>
                <div className="sidebar-section-title" style={{ color: textSecondary }}>Админ</div>
                <NavItem to="/admin/code-tasks" icon={<Code2 size={20} />} label="Задачи" isAdmin={isAdmin} />
                <NavItem to="/admin/code-game" icon={<Sword size={20} />} label="Code Game" isAdmin={isAdmin} />
                <NavItem to="/admin/analytics" icon={<BarChart2 size={20} />} label="Аналитика" isAdmin={isAdmin} />
                <div style={{ height: '16px' }} />
              </>
            )}

            {!isAdmin && (
              <>
                <NavItem to="/profile" icon={<UserIcon size={20} />} label="Профиль" isAdmin={isAdmin} />
                <NavItem to="/home#broadcast" icon={<Headphones size={20} />} label="Подкасты" isAdmin={isAdmin} />
              </>
            )}

            {isAdmin && (
              <>
                <div style={{ height: '16px' }} />
                <NavItem to="/profile" icon={<UserIcon size={20} />} label="Профиль" isAdmin={isAdmin} />
              </>
            )}
          </>
        ) : (
          <>
            <div
              style={{
                marginTop: '12px',
                padding: '16px',
                borderRadius: '18px',
                border: isAdmin ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)',
                background: isAdmin
                  ? 'linear-gradient(180deg, rgba(99,102,241,0.08) 0%, #f8fafc 100%)'
                  : 'linear-gradient(180deg, rgba(93,76,229,0.16) 0%, rgba(255,255,255,0.04) 100%)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 700, color: textPrimary, lineHeight: 1.3 }}>
                Зарегистрируйся и попади в рейтинг arena
              </div>
              <div style={{ fontSize: '13px', color: textSecondary, lineHeight: 1.5 }}>
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
                  background: accentColor,
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
            <NavItem to="/login" icon={<UserIcon size={20} />} label="Войти" isAdmin={isAdmin} />
          </>
        )}
      </nav>

      {isAuthenticated && (
        <div className="sidebar-desktop__footer">
          <button
            type="button"
            onClick={logout}
            aria-label="Выйти"
            className="sidebar-desktop__logout"
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = bgSurface;
              e.currentTarget.style.color = textPrimary;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = textSecondary;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            style={{ color: textSecondary }}
          >
            <LogOut size={20} style={{ flexShrink: 0 }} />
            <span style={{ display: 'block' }}>Выйти</span>
          </button>
        </div>
      )}
    </aside>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; to: string; isAdmin: boolean }> = ({ icon, label, to, isAdmin }) => (
  <NavLink
    to={to}
    end={to === '/home' || to === '/admin/code-tasks'}
    className="sidebar-desktop__nav-item"
    style={({ isActive }) => ({
      color: isActive
        ? (isAdmin ? '#6366f1' : 'var(--accent-color)')
        : (isAdmin ? '#475569' : 'var(--text-secondary)'),
      backgroundColor: isActive
        ? (isAdmin ? '#eff6ff' : 'var(--surface-color)')
        : 'transparent',
      fontWeight: isActive ? '600' : '500',
    })}
  >
    {icon} <span>{label}</span>
  </NavLink>
);
