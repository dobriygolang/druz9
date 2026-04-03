import React from 'react';
import { Code2 } from 'lucide-react';
import { HubShell } from '@/widgets/HubShell/ui/HubShell';

export const PracticeHubPage: React.FC = () => {
  return (
    <HubShell
      eyebrow="Practice"
      title="Практика кода в одном контуре"
      description="Code rooms, arena, рейтинги и будущие командные режимы собраны в одном месте. Здесь не должно быть лишнего шума и пустых широких блоков."
      tabs={[
        { to: '/practice/code-rooms', label: 'Code Rooms' },
        { to: '/practice/arena', label: 'Arena' },
      ]}
      aside={(
        <div className="hub-shell__stat-card">
          <Code2 size={18} />
          <div>
            <strong>Practice layer</strong>
            <span>Solo rooms, arena и будущие team battles</span>
          </div>
        </div>
      )}
    />
  );
};
