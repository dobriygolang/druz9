import React from 'react';
import { Sparkles } from 'lucide-react';
import { HubShell } from '@/widgets/HubShell/ui/HubShell';

export const GrowthHubPage: React.FC = () => {
  return (
    <HubShell
      eyebrow="Growth"
      title="Подготовка и карьерный трек"
      description="Подготовка к интервью, практика и вакансии собраны в одном месте. Здесь можно выбрать задачу, пройти mock и посмотреть карьерные возможности."
      tabs={[
        { to: '/growth/interview-prep', label: 'Interview Prep' },
        { to: '/growth/vacancies', label: 'Vacancies' },
      ]}
      aside={(
        <div className="hub-shell__stat-card">
          <Sparkles size={18} />
          <div>
            <strong>Growth</strong>
            <span>Подготовка, результаты и карьерные шаги</span>
          </div>
        </div>
      )}
    />
  );
};
