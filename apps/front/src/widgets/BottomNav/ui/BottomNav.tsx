import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  User as UserIcon,
  Code2,
  Menu,
  Users,
  Settings,
  Shield,
  LogOut,
  Sparkles,
  Headphones,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { MobileDrawer } from '@/shared/ui/MobileDrawer/MobileDrawer';

export const BottomNav: React.FC = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <>
      <nav className="bottom-nav-mobile">
        <BottomNavItem to="/home" icon={<Home size={20} />} label="Home" />
        <BottomNavItem to="/community/people" icon={<Users size={20} />} label="Community" />
        <BottomNavItem to="/practice/code-rooms" icon={<Code2 size={20} />} label="Practice" />
        <BottomNavItem to="/growth/interview-prep" icon={<Sparkles size={20} />} label="Growth" />
        <button
          type="button"
          className="bottom-nav-mobile__button"
          onClick={() => setIsMenuOpen(true)}
        >
          <Menu size={20} />
          <span>Меню</span>
        </button>
      </nav>

      <MobileDrawer 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)}
        title="Панель управления"
      >
        <div className="mobile-menu-grid">
          <MenuLink to="/profile" icon={<UserIcon size={20} />} label="Мой профиль" onClick={() => setIsMenuOpen(false)} />
          <MenuLink to="/community/circles" icon={<Users size={20} />} label="Circles" onClick={() => setIsMenuOpen(false)} />
          <MenuLink to="/community/events" icon={<Users size={20} />} label="Events" onClick={() => setIsMenuOpen(false)} />
          <MenuLink to="/growth/vacancies" icon={<Sparkles size={20} />} label="Вакансии" onClick={() => setIsMenuOpen(false)} />
          <MenuLink to="/growth/interview-prep" icon={<Sparkles size={20} />} label="Go Prep" onClick={() => setIsMenuOpen(false)} />
          <MenuLink to="/home#podcasts" icon={<Headphones size={20} />} label="Подкасты" onClick={() => setIsMenuOpen(false)} />
          
          {user?.isAdmin && (
            <>
              <div className="mobile-menu-divider">Администрирование</div>
              <MenuLink to="/admin/config" icon={<Settings size={20} />} label="Конфиг" onClick={() => setIsMenuOpen(false)} />
              <MenuLink to="/admin/code-tasks" icon={<Shield size={20} />} label="Задачи" onClick={() => setIsMenuOpen(false)} />
              <MenuLink to="/admin/interview-prep" icon={<Shield size={20} />} label="Interview Prep" onClick={() => setIsMenuOpen(false)} />
            </>
          )}

          <div className="mobile-menu-divider" />
          <button type="button" className="mobile-menu-logout" onClick={() => { logout(); setIsMenuOpen(false); }}>
            <LogOut size={20} />
            <span>Выйти из аккаунта</span>
          </button>
        </div>
      </MobileDrawer>
    </>
  );
};

const MenuLink: React.FC<{ to: string; icon: React.ReactNode; label: string; onClick: () => void }> = ({ to, icon, label, onClick }) => (
  <NavLink to={to} className="mobile-menu-link" onClick={onClick}>
    <div className="mobile-menu-link__icon">{icon}</div>
    <span>{label}</span>
  </NavLink>
);

const BottomNavItem: React.FC<{ icon: React.ReactNode; label: string; to: string }> = ({ icon, label, to }) => (
  <NavLink to={to} style={({ isActive }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
    minWidth: 0,
    padding: '8px 4px',
    color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: '10px',
    fontWeight: isActive ? '600' : '500',
    transition: 'color 0.2s'
  })}>
    {icon}
    <span>{label}</span>
  </NavLink>
);
