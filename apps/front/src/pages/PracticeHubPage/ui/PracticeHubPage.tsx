import React from 'react';
import { Code2 } from 'lucide-react';
import { HubShell } from '@/widgets/HubShell/ui/HubShell';

export const PracticeHubPage: React.FC = () => {
  return (
    <HubShell
      eyebrow="Practice"
      title="Code rooms and arena in one training flow"
      description="Coding practice теперь собрана в одном хабе: live-rooms, arena, рейтинги и следующие командные режимы должны ощущаться как единый продуктовый контур."
      tabs={[
        { to: '/practice/code-rooms', label: 'Code Rooms' },
        { to: '/practice/arena', label: 'Arena' },
      ]}
      aside={(
        <div className="hub-shell__stat-card">
          <Code2 size={18} />
          <div>
            <strong>Practice layer</strong>
            <span>Solo rooms, ranked arena and future team battles</span>
          </div>
        </div>
      )}
    />
  );
};
