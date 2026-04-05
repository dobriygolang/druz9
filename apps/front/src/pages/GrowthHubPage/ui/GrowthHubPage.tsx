import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ArrowRight, BookOpen, BrainCircuit, Briefcase, CheckCircle2, Sparkles } from 'lucide-react';

import { interviewPrepApi, InterviewPrepTask } from '@/features/InterviewPrep/api/interviewPrepApi';

export const GrowthHubPage: React.FC = () => {
  const [tasks, setTasks] = useState<InterviewPrepTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    interviewPrepApi.listTasks()
      .then((data) => { if (!cancelled) setTasks(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const executableCount = tasks.filter((t) => t.isExecutable).length;
  const codingCount = tasks.filter((t) => t.prepType === 'coding').length;
  const sysDesignCount = tasks.filter((t) => t.prepType === 'system_design').length;

  return (
    <div className="growth-hub fade-in">
      {/* Hero */}
      <section className="growth-hub__hero">
        <div className="growth-hub__hero-copy">
          <span className="hub-shell__eyebrow">Growth</span>
          <h1>Подготовка к интервью и карьерный трек</h1>
          <p>
            Прокачивай технические навыки, проходи mock-интервью с AI и находи актуальные вакансии.
          </p>
          <div className="growth-hub__hero-actions">
            <Link to="/growth/interview-prep" className="btn btn-primary">
              <BrainCircuit size={16} />
              Начать подготовку
            </Link>
            <Link to="/growth/vacancies" className="btn btn-secondary">
              <Briefcase size={16} />
              Вакансии
            </Link>
          </div>
        </div>
        <div className="growth-hub__hero-stats">
          <div className="growth-stat-card">
            <div className="growth-stat-card__icon">
              <BookOpen size={20} />
            </div>
            <div>
              <strong>{isLoading ? '—' : tasks.length}</strong>
              <span>задач для подготовки</span>
            </div>
          </div>
          <div className="growth-stat-card">
            <div className="growth-stat-card__icon" style={{ color: '#10b981' }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <strong>{isLoading ? '—' : executableCount}</strong>
              <span>с проверкой кода</span>
            </div>
          </div>
          <div className="growth-stat-card">
            <div className="growth-stat-card__icon" style={{ color: '#f59e0b' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <strong>{isLoading ? '—' : codingCount}</strong>
              <span>coding задач</span>
            </div>
          </div>
          <div className="growth-stat-card">
            <div className="growth-stat-card__icon" style={{ color: '#8b5cf6' }}>
              <BrainCircuit size={20} />
            </div>
            <div>
              <strong>{isLoading ? '—' : sysDesignCount}</strong>
              <span>system design</span>
            </div>
          </div>
        </div>
      </section>

      {/* Track cards */}
      <div className="growth-hub__tracks">
        <Link to="/growth/interview-prep" className="growth-track-card growth-track-card--prep">
          <div className="growth-track-card__icon">
            <BrainCircuit size={26} />
          </div>
          <div className="growth-track-card__body">
            <strong>Interview Prep</strong>
            <p>Coding, system design и behavioral задачи. Mock-интервью с AI-интервьюером в реальном времени.</p>
          </div>
          <ArrowRight size={16} className="growth-track-card__arrow" />
        </Link>

        <Link to="/growth/vacancies" className="growth-track-card growth-track-card--vacancies">
          <div className="growth-track-card__icon">
            <Briefcase size={26} />
          </div>
          <div className="growth-track-card__body">
            <strong>Вакансии</strong>
            <p>Актуальные предложения от компаний и участников сообщества. Фильтрация по формату и опыту.</p>
          </div>
          <ArrowRight size={16} className="growth-track-card__arrow" />
        </Link>
      </div>

      {/* Sub-nav */}
      <nav className="hub-shell__tabs">
        {[
          { to: '/growth/interview-prep', label: 'Interview Prep' },
          { to: '/growth/vacancies', label: 'Vacancies' },
        ].map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
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
