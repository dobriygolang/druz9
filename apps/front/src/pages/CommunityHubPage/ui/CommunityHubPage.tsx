import React from 'react';
import { Users } from 'lucide-react';
import { HubShell } from '@/widgets/HubShell/ui/HubShell';

export const CommunityHubPage: React.FC = () => {
  return (
    <HubShell
      eyebrow="Community"
      title="People, map, events and circles"
      description="Социальный слой собран в одном месте: больше не нужно переключаться между пятью соседними top-level страницами, чтобы понять, кто рядом и что происходит."
      tabs={[
        { to: '/community/people', label: 'People' },
        { to: '/community/events', label: 'Events' },
        { to: '/community/map', label: 'Map' },
        { to: '/community/circles', label: 'Circles' },
      ]}
      aside={(
        <div className="hub-shell__stat-card">
          <Users size={18} />
          <div>
            <strong>Social layer</strong>
            <span>Users, location, events and mini-communities</span>
          </div>
        </div>
      )}
    />
  );
};
