import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { geoApi } from '@/features/Geo/api/geoApi';
import {
  ArrowRight,
  BarChart2,
  ChevronDown,
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
  isLight?: boolean;
  /** @deprecated use isLight */
  isHome?: boolean;
  /** @deprecated use isLight */
  isCommunity?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isAdmin = false,
  isLight = true,
  isHome,
  isCommunity,
}) => {
  const location = useLocation();
  const { logout, isAuthenticated, user } = useAuth();
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  // Support legacy props — kept for backward-compatibility, actual usage driven by CSS vars
  void (isLight || isHome || isCommunity);

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

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'Профиль';
  const secondaryText = user?.username
    ? `@${user.username}`
    : (user?.region || (onlineCount !== null ? `${onlineCount} онлайн` : 'Аккаунт активен'));

  const sidebarClass = [
    'sidebar-desktop',
    isAdmin ? ' sidebar-desktop--admin' : '',
  ].join('');

  return (
    <aside className={sidebarClass}>
      <div className="sidebar-desktop__brand">
        <div className="sidebar-desktop__brand-home">
          <LunarisMark />
          <span className="sidebar-desktop__brand-home-label">LUNARIS</span>
        </div>
      </div>

      <nav className="sidebar-desktop__nav">
        {isAuthenticated ? (
          <>
            {!isAdmin && (
              <>
                <NavItem to="/home" icon={<Home size={20} />} label="Главная" />
                <NavItem to="/community/people" icon={<Users size={20} />} label="Community" />
                <NavItem to="/practice" icon={<Code2 size={20} />} label="Practice" />
                <NavItem to="/growth/interview-prep" icon={<Sparkles size={20} />} label="Growth" />
                <NavItem
                  to="/home#podcasts"
                  icon={<Headphones size={20} />}
                  label="Подкасты"
                  matchHash="#podcasts"
                  currentHash={location.hash}
                />
                <NavItem to="/practice/arena" icon={<Sword size={20} />} label="Arena" />
              </>
            )}

            {isAdmin && (
              <>
                <NavItem
                  to="/home"
                  icon={<ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />}
                  label="К приложению"
                />
                <div style={{ height: '8px' }} />

                <div className="sidebar-section-title">УПРАВЛЕНИЕ</div>
                <NavItem to="/admin/code-tasks" icon={<Code2 size={20} />} label="Code Tasks" />
                <NavItem to="/admin/code-game" icon={<Sword size={20} />} label="Code Game" />
                <NavItem to="/admin/interview-prep" icon={<Shield size={20} />} label="Interview Prep" />
                <NavItem to="/admin/config" icon={<Settings size={20} />} label="Config" />
                <div style={{ height: '8px' }} />
                <div className="sidebar-section-title">СТАТИСТИКА</div>
                <NavItem to="/admin/analytics" icon={<BarChart2 size={20} />} label="Analytics" />
                <div style={{ height: '16px' }} />
                <NavItem to="/profile" icon={<UserIcon size={20} />} label="Профиль" />
              </>
            )}

            {!isAdmin && user?.isAdmin && (
              <>
                <div className="sidebar-section-title">Админ</div>
                <NavItem to="/admin/code-tasks" icon={<Code2 size={20} />} label="Задачи" />
                <NavItem to="/admin/code-game" icon={<Sword size={20} />} label="Code Game" />
                <NavItem to="/admin/analytics" icon={<BarChart2 size={20} />} label="Аналитика" />
              </>
            )}
          </>
        ) : (
          <>
            <div
              style={{
                marginTop: '16px',
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid #CBCCC9',
                background: 'rgba(255, 132, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#111111', lineHeight: 1.3 }}>
                Зарегистрируйся и попади в рейтинг arena
              </div>
              <div style={{ fontSize: '13px', color: '#666666', lineHeight: 1.5 }}>
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
                  padding: '0 16px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  background: '#FF8400',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                <span>Войти и зарегистрироваться</span>
                <ArrowRight size={16} />
              </NavLink>
            </div>
            <div style={{ height: '8px' }} />
            <NavItem to="/login" icon={<UserIcon size={20} />} label="Войти" />
          </>
        )}
      </nav>

      {isAuthenticated ? (
        <div className="sidebar-desktop__footer">
          {!isAdmin ? (
            <NavLink to="/profile" className="sidebar-desktop__home-profile">
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#FF8400',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {getInitials(user?.firstName, user?.lastName, user?.username)}
              </div>
              <div className="sidebar-desktop__home-profile-copy">
                <strong>{displayName}</strong>
                <span>{secondaryText}</span>
              </div>
              <span className="sidebar-desktop__home-profile-chevron" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </NavLink>
          ) : (
            <button
              type="button"
              onClick={logout}
              aria-label="Выйти"
              className="sidebar-desktop__logout"
            >
              <LogOut size={18} style={{ flexShrink: 0 }} />
              <span>Выйти</span>
            </button>
          )}
        </div>
      ) : null}
    </aside>
  );
};

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  to: string;
  matchHash?: string;
  currentHash?: string;
}> = ({ icon, label, to, matchHash, currentHash }) => (
  <NavLink
    to={to}
    end={to === '/home' || to === '/admin/code-tasks'}
    className={({ isActive }) => {
      const active = matchHash ? currentHash === matchHash : isActive;
      return `sidebar-desktop__nav-item${active ? ' active' : ''}`;
    }}
  >
    {icon} <span>{label}</span>
  </NavLink>
);

function getInitials(firstName?: string, lastName?: string, username?: string): string {
  const first = firstName?.trim().charAt(0);
  const last = lastName?.trim().charAt(0);
  if (first || last) {
    return `${first ?? ''}${last ?? ''}`.toUpperCase();
  }
  return username?.trim().slice(0, 2).toUpperCase() || 'U';
}

const LunarisMark: React.FC = () => (
  <span className="sidebar-desktop__brand-home-mark" aria-hidden="true">
    <svg viewBox="0 0 32 32" fill="none">
      <path
        d="M16 0c8.83656 0 16 7.16344 16 16 0 8.83656-7.16344 16-16 16-8.83656 0-16-7.16344-16-16 0-8.83656 7.16344-16 16-16zm1.86035 8.71777c-.66585-1.68829-3.05485-1.68829-3.7207 0l-1.21485 3.08008c-.20329.51544-.61151.92366-1.12695 1.12695l-3.08008 1.21485c-1.68829.66585-1.68829 3.05485 0 3.7207l3.08008 1.21485c.51544.20329.92366.61151 1.12695 1.12695l1.21485 3.08008c.66585 1.68829 3.05485 1.68829 3.7207 0l1.21485-3.08008c.20329-.51544.61151-.92366 1.12695-1.12695l3.08008-1.21485c1.68829-.66585 1.68829-3.05485 0-3.7207l-3.08008-1.21485c-.51544-.20329-.92366-.61151-1.12695-1.12695l-1.21485-3.08008z"
        fill="#FF8400"
      />
    </svg>
  </span>
);
