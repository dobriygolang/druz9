import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

type HubTab = {
  to: string;
  label: string;
  end?: boolean;
};

interface HubShellProps {
  eyebrow?: string;
  title: string;
  description: string;
  tabs: HubTab[];
  aside?: React.ReactNode;
}

export const HubShell: React.FC<HubShellProps> = ({
  eyebrow,
  title,
  description,
  tabs,
  aside,
}) => {
  return (
    <div className="hub-shell fade-in">
      <section className="hub-shell__hero">
        <div className="hub-shell__copy">
          {eyebrow ? <span className="hub-shell__eyebrow">{eyebrow}</span> : null}
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {aside ? <div className="hub-shell__aside">{aside}</div> : null}
      </section>

      <nav className="hub-shell__tabs">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `hub-shell__tab ${isActive ? 'is-active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="hub-shell__content">
        <Outlet />
      </div>
    </div>
  );
};
