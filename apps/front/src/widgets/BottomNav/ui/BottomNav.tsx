import React from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, Calendar, MapPin, User as UserIcon, Video } from 'lucide-react';

export const BottomNav: React.FC = () => {
  return (
    <nav className="bottom-nav-mobile">
      <BottomNavItem to="/feed" icon={<Compass size={20} />} label="Лента" />
      <BottomNavItem to="/events" icon={<Calendar size={20} />} label="Ивенты" />
      <BottomNavItem to="/rooms" icon={<Video size={20} />} label="Комнаты" />
      <BottomNavItem to="/map" icon={<MapPin size={20} />} label="Карта" />
      <BottomNavItem to="/profile" icon={<UserIcon size={20} />} label="Профиль" />
    </nav>
  );
};

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
