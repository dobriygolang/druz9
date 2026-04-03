import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, MapPin, Pencil, Briefcase, Shield, X, Navigation, Trophy, Crown, Medal, Zap, Diamond, Send, BrainCircuit, Flame, TrendingUp, Target, ShieldCheck } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { ProfileCompetency, ProfileProgress, User } from '@/entities/User/model/types';
import { adminApi } from '@/features/Admin/api/adminApi';
import { authApi, clearProfileByIdCache } from '@/features/Auth/api/authApi';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { ArenaPlayerStats } from '@/entities/CodeRoom/model/types';
import { LocationPicker } from '@/features/Geo/ui/LocationPicker';

import { useIsMobile } from '@/shared/hooks/useIsMobile';

const EMPTY_PROGRESS: ProfileProgress = {
  overview: {
    practiceSessions: 0,
    practicePassedSessions: 0,
    practiceActiveDays: 0,
    completedMockSessions: 0,
    completedMockStages: 0,
    answeredQuestions: 0,
    averageStageScore: 0,
    averageQuestionScore: 0,
    currentStreakDays: 0,
  },
  competencies: [],
  strongest: [],
  weakest: [],
  recommendations: [],
  checkpoints: [],
  companies: [],
};

const RADAR_AXES = ['Slices', 'Concurrency', 'SQL', 'Architecture', 'System Design'];

function buildOrbitPoint(index: number, total: number, radius: number, centerX: number, centerY: number, angleOffset = -Math.PI / 2) {
  const angle = angleOffset + ((Math.PI * 2 * index) / total);
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  };
}

function formatCompetencyAttempts(item: ProfileCompetency) {
  return `${item.stageCount} stages • ${item.questionCount} questions • ${item.practiceSessions} practice`;
}

function confidenceLabel(value: ProfileCompetency['confidence']) {
  switch (value) {
    case 'verified':
      return 'Verified';
    case 'medium':
      return 'Medium';
    default:
      return 'Low';
  }
}

export const ProfilePage: React.FC = () => {
  const isMobile = useIsMobile();
  const { user: currentUser, updateLocation } = useAuth();
  const { userId } = useParams();
  const [user, setUser] = useState<User | null>(currentUser);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newWorkplace, setNewWorkplace] = useState(currentUser?.currentWorkplace || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [arenaStats, setArenaStats] = useState<ArenaPlayerStats | null>(null);
  const [progress, setProgress] = useState<ProfileProgress>(EMPTY_PROGRESS);
  const [isBindTelegramModalOpen, setIsBindTelegramModalOpen] = useState(false);
  const [telegramChallenge, setTelegramChallenge] = useState<{ token: string; botStartUrl: string } | null>(null);
  const [telegramCode, setTelegramCode] = useState('');
  const [isBindingTelegram, setIsBindingTelegram] = useState(false);
  const [trustedUpdating, setTrustedUpdating] = useState(false);
  const [adminUpdating, setAdminUpdating] = useState(false);
  const [hoveredCompetencyKey, setHoveredCompetencyKey] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  // Toast helpers
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (!userId) {
      setUser(currentUser);
      setError('');
      setIsLoading(false);
      return;
    }

    if (currentUser && userId === currentUser.id) {
      setUser(currentUser);
      setError('');
      setIsLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await authApi.getProfileById(userId);
        setUser(response.user);
      } catch (loadError) {
        setError('Не удалось загрузить профиль');
        console.error(loadError);
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, [currentUser, userId]);

  useEffect(() => {
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) {
      return;
    }
    codeRoomApi.getArenaStats(targetUserId)
      .then(setArenaStats)
      .catch((statsError) => {
        console.error('Failed to load arena stats', statsError);
      });
  }, [currentUser?.id, userId]);

  useEffect(() => {
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) {
      setProgress(EMPTY_PROGRESS);
      return;
    }
    authApi.getProfileProgress(targetUserId)
      .then(setProgress)
      .catch((progressError) => {
        console.error('Failed to load profile progress', progressError);
        setProgress(EMPTY_PROGRESS);
      });
  }, [currentUser?.id, userId]);

  if (isLoading) {
    return <div className="fade-in">Загрузка профиля...</div>;
  }

  if (error) {
    return <div className="fade-in">{error}</div>;
  }

  if (!user) {
    return null;
  }

  const isOwnProfile = !userId || currentUser?.id === user.id;
  const telegramProfileHandle = user.connectedProviders.includes('telegram') && user.telegramUsername
    ? `@${user.telegramUsername}`
    : 'профиль не привязан к тг';
  const competencies = progress.competencies.length > 0
    ? progress.competencies
    : RADAR_AXES.map((label, index) => ({
      key: `empty-${index}`,
      label,
      score: 0,
      practiceScore: 0,
      verifiedScore: 0,
      stageCount: 0,
      questionCount: 0,
      practiceSessions: 0,
      practicePassedSessions: 0,
      practiceDays: 0,
      confidence: 'low' as const,
      averageScore: 0,
    }));
  const hasProgressData = progress.overview.completedMockStages > 0 || progress.overview.answeredQuestions > 0 || progress.overview.practiceSessions > 0;
  const orbitGeometry = useMemo(() => {
    const centerX = 220;
    const centerY = 210;
    const baseRadius = 44;
    const orbitGap = 30;
    return competencies.map((item, orbitIndex) => {
      const nodeCount = 14;
      const totalCount = Math.round((Math.max(0, Math.min(100, item.score)) / 100) * nodeCount);
      const verifiedCount = Math.round((Math.max(0, Math.min(100, item.verifiedScore)) / 100) * nodeCount);
      const practiceCount = Math.max(0, totalCount - verifiedCount);
      const radius = baseRadius + orbitIndex * orbitGap;
      const angleOffset = (-Math.PI / 2) + orbitIndex * 0.28;
      const nodes = Array.from({ length: nodeCount }, (_, nodeIndex) => ({
        ...buildOrbitPoint(nodeIndex, nodeCount, radius, centerX, centerY, angleOffset),
        status: nodeIndex < verifiedCount ? 'verified' : nodeIndex < verifiedCount + practiceCount ? 'practice' : 'inactive',
        delay: orbitIndex * 0.22 + nodeIndex * 0.05,
      }));
      const labelPoint = buildOrbitPoint(Math.max(1, orbitIndex * 2), nodeCount, radius + 30, centerX, centerY, angleOffset);
      const circumference = 2 * Math.PI * radius;
      const verifiedArc = circumference * (Math.max(0, Math.min(100, item.verifiedScore)) / 100);
      const practiceArc = circumference * (Math.max(0, Math.min(100, item.score)) / 100);
      return {
        ...item,
        radius,
        nodes,
        labelPoint,
        circumference,
        verifiedDashOffset: circumference - verifiedArc,
        practiceDashOffset: circumference - practiceArc,
      };
    });
  }, [competencies]);
  const hoveredCompetency = orbitGeometry.find((item) => item.key === hoveredCompetencyKey) ?? orbitGeometry[0] ?? null;

  const getLeagueInfo = (league: string) => {
    const leagues: Record<string, { name: string; icon: React.ReactNode; className: string }> = {
      novice: { name: 'Novice', icon: <Zap size={28} />, className: 'novice' },
      rookie: { name: 'Rookie', icon: <Zap size={28} />, className: 'rookie' },
      bronze: { name: 'Bronze', icon: <Medal size={28} color="#CD7F32" />, className: 'bronze' },
      silver: { name: 'Silver', icon: <Medal size={28} color="#C0C0C0" />, className: 'silver' },
      gold: { name: 'Gold', icon: <Trophy size={28} color="#FFD700" />, className: 'gold' },
      platinum: { name: 'Platinum', icon: <Medal size={28} color="#E5E4E2" />, className: 'platinum' },
      diamond: { name: 'Diamond', icon: <Diamond size={28} color="#00C7E3" />, className: 'diamond' },
      master: { name: 'Master', icon: <Crown size={28} />, className: 'master' },
    };
    return leagues[league?.toLowerCase()] || leagues.novice;
  };

  const [workplaceMessage, setWorkplaceMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdateWorkplace = async () => {
    if (!newWorkplace.trim()) return;
    try {
      setIsSubmitting(true);
      setWorkplaceMessage(null);
      const resp = await authApi.updateProfile({ currentWorkplace: newWorkplace });
      setUser(resp.user);
      setWorkplaceMessage({ type: 'success', text: 'Место работы обновлено' });
      setTimeout(() => setWorkplaceMessage(null), 3000);
    } catch (err) {
      setWorkplaceMessage({ type: 'error', text: 'Ошибка при сохранении' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenBindTelegram = async () => {
    try {
      const challenge = await authApi.createTelegramAuthChallenge();
      setTelegramChallenge(challenge);
      setIsBindTelegramModalOpen(true);
    } catch (err) {
      console.error('Failed to create telegram challenge', err);
      showToast('Не удалось начать привязку Telegram', 'error');
    }
  };

  const handleBindTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramChallenge?.token || !telegramCode) {
      showToast('Введите код из Telegram', 'error');
      return;
    }
    try {
      setIsBindingTelegram(true);
      await authApi.bindTelegram(telegramChallenge.token, telegramCode);
      // Refresh user profile after binding
      const profile = await authApi.getProfile();
      setUser(profile.user);
      setIsBindTelegramModalOpen(false);
      setTelegramCode('');
      showToast('Telegram успешно привязан!', 'success');
    } catch (err: any) {
      console.error('Failed to bind telegram', err);
      const msg = err?.response?.data?.message || err?.message || '';
      if (msg.includes('already bound') || msg.includes('conflict')) {
        showToast('Этот Telegram уже привязан к другому аккаунту', 'error');
      } else {
        showToast('Не удалось привязать Telegram. Проверьте код.', 'error');
      }
    } finally {
      setIsBindingTelegram(false);
    }
  };

  return (
    <div className="fade-in profile-page">
      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="profile-toasts">
          {toasts.map((toast) => (
            <div key={toast.id} className={`profile-toast profile-toast--${toast.type}`}>
              <span>{toast.message}</span>
              <button
                type="button"
                className="profile-toast__close"
                onClick={() => removeToast(toast.id)}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!isOwnProfile && (
        <Link
          to="/map"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            marginBottom: '20px',
          }}
        >
          <ArrowLeft size={18} /> Назад к карте
        </Link>
      )}

      <div className="profile-header" style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '12px' : '20px' }}>
        <h1 style={{ fontSize: isMobile ? '28px' : '32px' }}>Профиль</h1>
        {isOwnProfile && (
          <button
            className={`btn btn-primary ${isMobile ? 'w-full' : ''}`}
            onClick={() => setIsEditModalOpen(true)}
            style={{ height: isMobile ? '48px' : 'auto' }}
          >
            <Pencil size={18} /> Редактировать профиль
          </button>
        )}
      </div>

      {/* League Banner */}
      {arenaStats && (
        <div className={`profile-league-banner profile-league-banner--${getLeagueInfo(arenaStats.league).className}`}>
          <div className="profile-league-banner__glow" />
          <div className="profile-league-banner__content" style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '8px' : '20px' }}>
            <div className="profile-league-banner__title">
              {getLeagueInfo(arenaStats.league).icon}
              <h3 className={`profile-league-banner__title--${getLeagueInfo(arenaStats.league).className}`} style={{ fontSize: isMobile ? '18px' : '22px' }}>
                {getLeagueInfo(arenaStats.league).name}
              </h3>
              <span className="arena-elo-badge" style={{ marginLeft: 8 }}>{arenaStats.rating}</span>
            </div>
            {!isMobile && (
              <div className="profile-league-banner__stats">
                <span className="profile-league-banner__stat">{arenaStats.matches} матчей</span>
                <span className="profile-league-banner__stat">{arenaStats.wins} побед</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="card profile-main-card">
        <div
          className="profile-avatar"
          style={{
            '--avatar-url': user.avatarUrl ? `url(${user.avatarUrl})` : 'none',
          } as React.CSSProperties}
        >
          {!user.avatarUrl && (user.firstName?.charAt(0) || user.username?.charAt(0) || '').toUpperCase()}
        </div>

        <div className="profile-info" style={{ 
          textAlign: isMobile ? 'center' : 'left',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMobile ? 'center' : 'flex-start',
          gap: isMobile ? '4px' : '0'
        }}>
          <h2 className="profile-name" style={{ 
            fontSize: isMobile ? '24px' : '28px',
            justifyContent: isMobile ? 'center' : 'flex-start'
          }}>
            {user.firstName || ''} {user.lastName || ''}
            {!user.firstName && !user.lastName ? user.username : ''}
          </h2>
          <div className="profile-username">
            {telegramProfileHandle}
          </div>
          <div className="profile-details" style={{ 
            justifyContent: isMobile ? 'center' : 'flex-start' 
          }}>
            <div className="profile-detail-item">
              <MapPin size={16} /> {user.region}
            </div>

            {user.currentWorkplace && !isMobile && (
              <div className="profile-detail-item">
                <Briefcase size={16} /> {user.currentWorkplace}
              </div>
            )}

            <div className={`profile-status ${user.activityStatus === 'online' ? 'profile-status--online' : user.activityStatus === 'recently_active' ? 'profile-status--recently' : 'profile-status--offline'}`}>
              <div className="profile-status-dot" />
              {user.activityStatus === 'online' ? 'В сети' :
               user.activityStatus === 'recently_active' ? 'Был' : 'Offline'}
            </div>
          </div>
        </div>

        <div className="profile-badges" style={{ 
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'center' : 'flex-start',
          marginTop: isMobile ? '12px' : '0'
        }}>
          {user.isAdmin && (
            <span className="profile-badge profile-badge--admin">
              <Shield size={14} />
              Админ
            </span>
          )}

          {currentUser?.isAdmin && user?.id && (
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: '12px' }}
              disabled={trustedUpdating}
              onClick={async () => {
                try {
                  setTrustedUpdating(true);
                  await adminApi.setUserTrusted(user.id, !user.isTrusted);
                  // Clear cache and refresh user profile
                  clearProfileByIdCache(user.id);
                  const profile = await authApi.getProfileById(user.id);
                  setUser(profile.user);
                  showToast(user.isTrusted ? 'Trusted снят' : 'Пользователь стал trusted', 'success');
                } catch (e) {
                  console.error('Failed to update trusted flag:', e);
                  showToast('Ошибка при обновлении', 'error');
                } finally {
                  setTrustedUpdating(false);
                }
              }}
            >
              {trustedUpdating ? 'Сохраняем...' : user.isTrusted ? 'Снять trusted' : 'Сделать trusted'}
            </button>
          )}

          {currentUser?.isAdmin && user?.id && (
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: '12px' }}
              disabled={adminUpdating}
              onClick={async () => {
                try {
                  setAdminUpdating(true);
                  await adminApi.setUserAdmin(user.id, !user.isAdmin);
                  clearProfileByIdCache(user.id);
                  const profile = await authApi.getProfileById(user.id);
                  setUser(profile.user);
                  showToast(user.isAdmin ? 'Права администратора сняты' : 'Пользователь стал админом', 'success');
                } catch (e) {
                  console.error('Failed to update admin flag:', e);
                  showToast('Ошибка при обновлении прав администратора', 'error');
                } finally {
                  setAdminUpdating(false);
                }
              }}
            >
              {adminUpdating ? 'Сохраняем...' : user.isAdmin ? 'Снять админа' : 'Сделать админом'}
            </button>
          )}

          {isOwnProfile && user.connectedProviders.includes('yandex') && (
            <span className="profile-badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}>
              <CheckCircle size={14} />
              Яндекс подключен
            </span>
          )}

          {isOwnProfile && user.connectedProviders.includes('telegram') ? (
            <span className="profile-badge" style={{ background: 'var(--success)', color: 'white' }}>
              <CheckCircle size={14} />
              Telegram подключен
            </span>
          ) : isOwnProfile ? (
            <button
              className="btn btn-primary profile-telegram-btn"
              onClick={handleOpenBindTelegram}
            >
              <Send size={12} />
              Привязать Telegram
            </button>
          ) : null}
        </div>
      </div>

      <section className="profile-progress-section">
        <div className="profile-progress-section__header">
          <div>
            <h2>Progress profile</h2>
            <p>Practice и verified skill теперь разведены: solo накапливает объем, а mock и arena подтверждают реальный сигнал.</p>
          </div>
          <div className="profile-progress-section__badges">
            <span className="profile-progress-badge"><Flame size={14} /> {progress.overview.currentStreakDays} day streak</span>
            <span className="profile-progress-badge"><TrendingUp size={14} /> {progress.overview.practiceSessions} practice runs</span>
          </div>
        </div>

        <div className="profile-progress-layout">
          <div className="card profile-progress-card profile-progress-card--radar">
            <div className="profile-progress-card__header">
              <div>
                <h3><BrainCircuit size={18} /> Competency graph</h3>
                <p>Orbital map навыков: каждая орбита это отдельная зона, а узлы и дуги анимированно показывают depth и confidence сигнала.</p>
              </div>
            </div>

            <div className="profile-progress-orbit" onMouseLeave={() => setHoveredCompetencyKey(null)}>
              <svg viewBox="0 0 440 420" className="profile-progress-orbit__svg" role="img" aria-label="Competency orbit map">
                <defs>
                  <radialGradient id="profile-orbit-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(103, 232, 249, 0.78)" />
                    <stop offset="55%" stopColor="rgba(34, 211, 238, 0.18)" />
                    <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
                  </radialGradient>
                </defs>
                <circle cx="220" cy="210" r="34" className="profile-progress-orbit__core" />
                <circle cx="220" cy="210" r="72" className="profile-progress-orbit__pulse" />
                {orbitGeometry.map((orbit, orbitIndex) => (
                  <g key={orbit.key} onMouseEnter={() => setHoveredCompetencyKey(orbit.key)} className={hoveredCompetencyKey === orbit.key ? 'is-hovered' : ''}>
                    <circle cx="220" cy="210" r={orbit.radius} className="profile-progress-orbit__ring" style={{ animationDelay: `${orbitIndex * 0.16}s` }} />
                    <circle
                      cx="220"
                      cy="210"
                      r={orbit.radius}
                      className="profile-progress-orbit__arc profile-progress-orbit__arc--practice"
                      style={{
                        strokeDasharray: orbit.circumference,
                        strokeDashoffset: orbit.practiceDashOffset,
                        transform: `rotate(${orbitIndex * 26 - 90}deg)`,
                        transformOrigin: '220px 210px',
                        animationDelay: `${0.18 + orbitIndex * 0.16}s`,
                      }}
                    />
                    <circle
                      cx="220"
                      cy="210"
                      r={orbit.radius}
                      className="profile-progress-orbit__arc profile-progress-orbit__arc--verified"
                      style={{
                        strokeDasharray: orbit.circumference,
                        strokeDashoffset: orbit.verifiedDashOffset,
                        transform: `rotate(${orbitIndex * 26 - 90}deg)`,
                        transformOrigin: '220px 210px',
                        animationDelay: `${0.3 + orbitIndex * 0.16}s`,
                      }}
                    />
                    {orbit.nodes.map((node, nodeIndex) => (
                      <circle
                        key={`${orbit.key}-${nodeIndex}`}
                        cx={node.x}
                        cy={node.y}
                        r={node.status === 'verified' ? 5.8 : node.status === 'practice' ? 4.8 : 3.2}
                        className={`profile-progress-orbit__node profile-progress-orbit__node--${node.status}`}
                        style={{ animationDelay: `${node.delay}s` }}
                      />
                    ))}
                    <text x={orbit.labelPoint.x} y={orbit.labelPoint.y} className="profile-progress-orbit__label" textAnchor="middle">
                      {orbit.label}
                    </text>
                    <text x={orbit.labelPoint.x} y={orbit.labelPoint.y + 16} className="profile-progress-orbit__value" textAnchor="middle">
                      {orbit.score}
                    </text>
                  </g>
                ))}
                <circle cx="220" cy="210" r="54" fill="url(#profile-orbit-glow)" className="profile-progress-orbit__glow" />
              </svg>
              {hoveredCompetency && (
                <div className="profile-progress-orbit__tooltip">
                  <div className="profile-progress-orbit__tooltip-top">
                    <strong>{hoveredCompetency.label}</strong>
                    <span className={`profile-progress-confidence profile-progress-confidence--${hoveredCompetency.confidence}`}>{confidenceLabel(hoveredCompetency.confidence)}</span>
                  </div>
                  <p>Blended {hoveredCompetency.score} • Verified {hoveredCompetency.verifiedScore} • Practice {hoveredCompetency.practiceScore}</p>
                  <p>{hoveredCompetency.stageCount} stages • {hoveredCompetency.questionCount} questions • {hoveredCompetency.practiceDays} independent days</p>
                </div>
              )}
              <div className="profile-progress-orbit__legend">
                {competencies.map((item) => (
                  <div
                    key={`legend-${item.key}`}
                    className={`profile-progress-orbit__legend-item ${hoveredCompetencyKey === item.key ? 'is-hovered' : ''}`}
                    onMouseEnter={() => setHoveredCompetencyKey(item.key)}
                  >
                    <span className={`profile-progress-confidence profile-progress-confidence--${item.confidence}`}>{confidenceLabel(item.confidence)}</span>
                    <strong>{item.label}</strong>
                    <small>Verified {item.verifiedScore} • Practice {item.practiceScore}</small>
                  </div>
                ))}
              </div>
            </div>

            {!hasProgressData && (
              <div className="profile-progress-empty">
                Пока мало данных. Начни с practice или mock interview, и профиль начнет собирать volume и verified skill отдельно.
              </div>
            )}
          </div>

          <div className="card profile-progress-card">
            <div className="profile-progress-card__header">
              <div>
                <h3><Target size={18} /> Practice volume</h3>
                <p>Это обучающий слой. Он показывает, сколько solo-попыток уже накоплено, но не претендует на verified skill.</p>
              </div>
            </div>

            <div className="profile-progress-metrics">
              <div className="profile-progress-metric">
                <span className="label">Practice sessions</span>
                <strong>{progress.overview.practiceSessions}</strong>
              </div>
              <div className="profile-progress-metric">
                <span className="label">Passed sessions</span>
                <strong>{progress.overview.practicePassedSessions}</strong>
              </div>
              <div className="profile-progress-metric">
                <span className="label">Active days</span>
                <strong>{progress.overview.practiceActiveDays}</strong>
              </div>
              <div className="profile-progress-metric">
                <span className="label">Finished mocks</span>
                <strong>{progress.overview.completedMockSessions}</strong>
              </div>
              <div className="profile-progress-metric">
                <span className="label">Completed stages</span>
                <strong>{progress.overview.completedMockStages}</strong>
              </div>
              <div className="profile-progress-metric">
                <span className="label">Current streak</span>
                <strong>{progress.overview.currentStreakDays} days</strong>
              </div>
            </div>

            {progress.companies.length > 0 && (
              <div className="profile-progress-company-strip">
                <span className="profile-progress-company-strip__label">Companies</span>
                <div className="profile-progress-company-strip__items">
                  {progress.companies.map((company) => (
                    <span key={company} className="profile-progress-company-pill">{company}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="profile-progress-layout profile-progress-layout--secondary">
          <div className="card profile-progress-card">
            <div className="profile-progress-card__header">
              <div>
                <h3>Verified skill</h3>
                <p>Сильные зоны теперь показывают verified signal, practice volume и confidence по каждой теме.</p>
              </div>
            </div>
            <div className="profile-progress-list">
              {progress.strongest.length > 0 ? progress.strongest.map((item) => (
                <div key={item.key} className="profile-progress-list__item">
                  <div>
                    <div className="profile-progress-list__title">
                      <strong>{item.label}</strong>
                      <span className={`profile-progress-confidence profile-progress-confidence--${item.confidence}`}>{confidenceLabel(item.confidence)}</span>
                    </div>
                    <span>{formatCompetencyAttempts(item)}</span>
                    <span>Verified {item.verifiedScore} • Practice {item.practiceScore} • {item.practiceDays} independent days</span>
                  </div>
                  <b>{item.score}</b>
                </div>
              )) : <div className="profile-progress-empty compact">Сильные зоны появятся после первых mock interview.</div>}
            </div>
          </div>

          <div className="card profile-progress-card">
            <div className="profile-progress-card__header">
              <div>
                <h3>Weakest zones</h3>
                <p>Здесь виден разрыв между practice и verified skill. Обычно именно отсюда начинается самый быстрый рост.</p>
              </div>
            </div>
            <div className="profile-progress-list">
              {progress.weakest.length > 0 ? progress.weakest.map((item) => (
                <div key={item.key} className="profile-progress-list__item">
                  <div>
                    <div className="profile-progress-list__title">
                      <strong>{item.label}</strong>
                      <span className={`profile-progress-confidence profile-progress-confidence--${item.confidence}`}>{confidenceLabel(item.confidence)}</span>
                    </div>
                    <span>{formatCompetencyAttempts(item)}</span>
                    <span>Verified {item.verifiedScore} • Practice {item.practiceScore} • {item.practiceDays} independent days</span>
                  </div>
                  <b>{item.score}</b>
                </div>
              )) : <div className="profile-progress-empty compact">Пока недостаточно данных для слабых зон.</div>}
            </div>
          </div>

          <div className="card profile-progress-card">
            <div className="profile-progress-card__header">
              <div>
                <h3>Recommended next</h3>
                <p>Следующие ходы, которые дадут самый заметный сигнал по профилю.</p>
              </div>
            </div>
            <div className="profile-progress-recommendations">
              {progress.recommendations.length > 0 ? progress.recommendations.map((item) => (
                <div key={item.key} className="profile-progress-recommendation">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                  {isOwnProfile && (
                    <Link to={item.href} className="profile-progress-link">Открыть</Link>
                  )}
                </div>
              )) : <div className="profile-progress-empty compact">Рекомендации появятся после завершенных mock stages.</div>}
            </div>
          </div>
        </div>

        <div className="card profile-progress-card">
          <div className="profile-progress-card__header">
            <div>
              <h3><ShieldCheck size={18} /> Passed checkpoints</h3>
              <p>Только успешно закрытые timed checkpoints. Это самый чистый verified signal после mock.</p>
            </div>
          </div>
          <div className="profile-progress-checkpoints">
            {progress.checkpoints.length > 0 ? progress.checkpoints.map((item) => (
              <div key={item.id} className="profile-progress-checkpoint">
                <div>
                  <strong>{item.taskTitle}</strong>
                  <span>{item.skillLabel} • {item.finishedAt ? new Date(item.finishedAt).toLocaleDateString('ru-RU') : 'passed'}</span>
                </div>
                <b>{item.score}</b>
              </div>
            )) : <div className="profile-progress-empty compact">Passed checkpoints пока нет. Первый checkpoint сразу начнет наполнять verified timeline.</div>}
          </div>
        </div>
      </section>

      {/* Info Grid */}
      <div className="profile-info-section">
        <h2>Информация</h2>
        <div className="profile-info-grid" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)' }}>
          <div className="profile-info-card">
            <h3><MapPin size={14} /> Локация</h3>
            <p>{user.region || 'Не указано'}</p>
          </div>

          <div className="profile-info-card">
            <h3><Briefcase size={14} /> Работа</h3>
            <p className="text-prune-1">{user.currentWorkplace || 'Не указано'}</p>
          </div>

          {!isMobile && (
            <div className="profile-info-card">
              <h3><Navigation size={14} /> Координаты</h3>
              <p>{user.latitude.toFixed(4)}, {user.longitude.toFixed(4)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="profile-modal-overlay">
          <div className="profile-modal fade-in">
            <button
              className="profile-modal-close"
              onClick={() => { setIsEditModalOpen(false); }}
            >
              <X size={24} />
            </button>

            <h2>Редактировать профиль</h2>

            <div className="profile-modal-section">
              <h3>Аватар</h3>
              <p className="profile-provider-avatar-note">
                Аватар берётся из подключённых провайдеров Яндекс или Telegram и больше не загружается в Druz9.
              </p>
            </div>

            {/* Workplace Section */}
            <div className="profile-modal-section">
              <h3><Briefcase size={18} /> Место работы</h3>
              <div className="profile-workplace-form">
                <input
                  className="input"
                  placeholder="Компания или проект..."
                  aria-label="Название компании"
                  value={newWorkplace}
                  onChange={e => setNewWorkplace(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newWorkplace.trim()}
                  className="btn btn-primary"
                  onClick={handleUpdateWorkplace}
                >
                  {isSubmitting ? 'Сохранение...' : 'Обновить'}
                </button>
              </div>
              {workplaceMessage && (
                <p className={`profile-workplace-message profile-workplace-message--${workplaceMessage.type}`}>
                  {workplaceMessage.text}
                </p>
              )}
              {!user.currentWorkplace && !newWorkplace && (
                <p className="profile-workplace-current">Укажите ваше место работы</p>
              )}
            </div>

            {/* Location Section */}
            <div className="profile-modal-section">
              <h3><MapPin size={18} /> Локация</h3>
              <p>Отметьте вашу позицию на карте</p>
              <LocationPicker
                inputPlaceholder={user.region || 'Например: Электросталь, Россия'}
                showPreviewMap={false}
                submitLabel="Сохранить новую позицию"
                submitLoadingLabel="Сохраняем..."
                onSubmit={async (payload) => {
                  try {
                    await updateLocation(payload);
                    const response = await authApi.getProfile();
                    setUser(response.user);
                    showToast('Локация обновлена', 'success');
                  } catch (err) {
                    showToast('Ошибка при обновлении локации', 'error');
                  }
                }}
              />
            </div>

            <div className="profile-modal-actions">
              <button
                className="btn btn-primary"
                onClick={() => { setIsEditModalOpen(false); }}
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bind Telegram Modal */}
      {isBindTelegramModalOpen && telegramChallenge && (
        <div className="profile-modal-overlay">
          <div className="profile-modal fade-in">
            <button
              className="profile-modal-close"
              onClick={() => setIsBindTelegramModalOpen(false)}
            >
              <X size={24} />
            </button>

            <h2>Привязать Telegram</h2>

            <div className="profile-modal-section">
              <p>Нажмите на кнопку ниже, чтобы открыть Telegram-бот и получить код подтверждения.</p>
              <a
                href={telegramChallenge.botStartUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
              >
                <Send size={18} />
                Открыть Telegram
              </a>
            </div>

            <div className="profile-modal-section">
              <h3>Код подтверждения</h3>
              <form onSubmit={handleBindTelegram} style={{ display: 'flex', gap: '12px' }}>
                <input
                  className="input"
                  placeholder="Введите код из Telegram"
                  aria-label="Код из Telegram"
                  value={telegramCode}
                  onChange={e => setTelegramCode(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  disabled={isBindingTelegram || !telegramCode}
                  className="btn btn-primary"
                >
                  {isBindingTelegram ? 'Привязываем...' : 'Привязать'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
