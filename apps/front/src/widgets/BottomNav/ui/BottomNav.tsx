import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Compass, 
  Calendar, 
  MapPin, 
  User as UserIcon, 
  Code2,
  Menu,
  Users,
  Briefcase,
  BookOpen,
  Settings,
  Shield,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { MobileDrawer } from '@/shared/ui/MobileDrawer/MobileDrawer';

export const BottomNav: React.FC = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <>
      <nav className="bottom-nav-mobile">
        <BottomNavItem to="/feed" icon={<Compass size={20} />} label="Лента" />
        <BottomNavItem to="/events" icon={<Calendar size={20} />} label="Ивенты" />
        <BottomNavItem to="/code-rooms" icon={<Code2 size={20} />} label="Код" />
        <BottomNavItem to="/map" icon={<MapPin size={20} />} label="Карта" />
        <button 
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
          <MenuLink to="/users" icon={<Users size={20} />} label="Сообщество" onClick={() => setIsMenuOpen(false)} />
          <MenuLink to="/vacancies" icon={<Briefcase size={20} />} label="Вакансии" onClick={() => setIsMenuOpen(false)} />
          
          <MenuLink to="/interview-prep" icon={<BookOpen size={20} />} label="Go Prep" onClick={() => setIsMenuOpen(false)} />
          
          {user?.isAdmin && (
            <>
              <div className="mobile-menu-divider">Администрирование</div>
              <MenuLink to="/admin/config" icon={<Settings size={20} />} label="Конфиг" onClick={() => setIsMenuOpen(false)} />
              <MenuLink to="/admin/code-tasks" icon={<Shield size={20} />} label="Задачи" onClick={() => setIsMenuOpen(false)} />
              <MenuLink to="/admin/interview-prep" icon={<Shield size={20} />} label="Interview Prep" onClick={() => setIsMenuOpen(false)} />
            </>
          )}

          <div className="mobile-menu-divider" />
          <button className="mobile-menu-logout" onClick={() => { logout(); setIsMenuOpen(false); }}>
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
