import React from 'react';
import { Sparkles } from 'lucide-react';
import { HubShell } from '@/widgets/HubShell/ui/HubShell';

export const GrowthHubPage: React.FC = () => {
  return (
    <HubShell
      eyebrow="Growth"
      title="Подготовка и карьерный трек"
      description="Interview Prep и вакансии объединены в growth-контур: прокачка навыков и карьерные шаги больше не висят отдельными несвязанными разделами."
      tabs={[
        { to: '/growth/interview-prep', label: 'Interview Prep' },
        { to: '/growth/vacancies', label: 'Vacancies' },
      ]}
      aside={(
        <div className="hub-shell__stat-card">
          <Sparkles size={18} />
          <div>
            <strong>Growth layer</strong>
            <span>Preparation, outcomes and next career moves</span>
          </div>
        </div>
      )}
    />
  );
};
