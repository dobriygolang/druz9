import React from 'react';
import { Code2 } from 'lucide-react';
import { HubShell } from '@/widgets/HubShell/ui/HubShell';

export const PracticeHubPage: React.FC = () => {
  return (
    <HubShell
      eyebrow="Practice"
      title="Code rooms и arena в одном тренировочном контуре"
      description="Весь coding practice теперь собран в одном хабе: live-rooms, arena, рейтинги и будущие командные режимы ощущаются как один продуктовый слой."
      tabs={[
        { to: '/practice/code-rooms', label: 'Code Rooms' },
        { to: '/practice/arena', label: 'Arena' },
      ]}
      aside={(
        <div className="hub-shell__stat-card">
          <Code2 size={18} />
          <div>
            <strong>Practice layer</strong>
            <span>Solo rooms, рейтинговая arena и будущие team battles</span>
          </div>
        </div>
      )}
    />
  );
};
