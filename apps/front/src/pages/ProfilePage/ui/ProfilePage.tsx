import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, MapPin, Pencil, Briefcase, Shield, X, Navigation, Trophy, Crown, Medal, Zap, Diamond } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { User } from '@/entities/User/model/types';
import { authApi } from '@/features/Auth/api/authApi';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { ArenaPlayerStats } from '@/entities/CodeRoom/model/types';
import { LocationPicker } from '@/features/Geo/ui/LocationPicker';
export const ProfilePage: React.FC = () => {
  const { user: currentUser, updateLocation } = useAuth();
  const { userId } = useParams();
  const [user, setUser] = useState<User | null>(currentUser);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newWorkplace, setNewWorkplace] = useState(currentUser?.currentWorkplace || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [arenaStats, setArenaStats] = useState<ArenaPlayerStats | null>(null);

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

  const handleUpdateWorkplace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const resp = await authApi.updateProfile({ currentWorkplace: newWorkplace });
      setUser(resp.user);
      // We don't close the modal here because the user might want to change location too
      alert('Место работы обновлено');
    } catch (err) {
      alert('Ошибка при сохранении');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fade-in profile-page">
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

      <div className="profile-header">
        <h1>Профиль</h1>
        {isOwnProfile && (
          <button
            className="btn profile-edit-btn"
            onClick={() => setIsEditModalOpen(true)}
          >
            <Pencil size={18} /> Редактировать профиль
          </button>
        )}
      </div>

      {/* League Banner */}
      {arenaStats && (
        <div className={`profile-league-banner profile-league-banner--${getLeagueInfo(arenaStats.league).className}`}>
          <div className="profile-league-banner__glow" />
          <div className="profile-league-banner__content">
            <div className="profile-league-banner__title">
              {getLeagueInfo(arenaStats.league).icon}
              <h3 className={`profile-league-banner__title--${getLeagueInfo(arenaStats.league).className}`}>
                {getLeagueInfo(arenaStats.league).name} Лига
              </h3>
              <span className="arena-elo-badge" style={{ marginLeft: 8 }}>{arenaStats.rating} ELO</span>
            </div>
            <div className="profile-league-banner__stats">
              <span className="profile-league-banner__stat">{arenaStats.matches} матчей</span>
              <span className="profile-league-banner__stat">{arenaStats.wins} побед</span>
            </div>
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
          {!user.avatarUrl && user.telegramUsername?.charAt(0).toUpperCase()}
        </div>

        <div className="profile-info">
          <h2 className="profile-name">
            {user.firstName || ''} {user.lastName || ''}
            {!user.firstName && !user.lastName ? user.telegramUsername : ''}
          </h2>
          <div className="profile-username">
            @{user.telegramUsername}
          </div>
          <div className="profile-details">
            <div className="profile-detail-item">
              <MapPin size={16} /> {user.region}
            </div>

            {user.currentWorkplace && (
              <div className="profile-detail-item">
                <Briefcase size={16} /> {user.currentWorkplace}
              </div>
            )}

            <div className={`profile-status ${user.activityStatus === 'online' ? 'profile-status--online' : user.activityStatus === 'recently_active' ? 'profile-status--recently' : 'profile-status--offline'}`}>
              <div className="profile-status-dot" />
              {user.activityStatus === 'online' ? 'В сети' :
               user.activityStatus === 'recently_active' ? 'Был недавно' : 'Не в сети'}
            </div>
          </div>
        </div>

        <div className="profile-badges">
          <span className="profile-badge profile-badge--account">
            <CheckCircle size={14} />
            Аккаунт
          </span>

          {user.isAdmin && (
            <span className="profile-badge profile-badge--admin">
              <Shield size={14} />
              Админ
            </span>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="profile-info-section">
        <h2>Данные профиля</h2>
        <div className="profile-info-grid">
          <div className="profile-info-card">
            <h3><MapPin size={14} /> Локация</h3>
            <p>{user.region || 'Не указано'}</p>
          </div>

          <div className="profile-info-card">
            <h3><Briefcase size={14} /> Работа</h3>
            <p>{user.currentWorkplace || 'Не указано'}</p>
          </div>

          <div className="profile-info-card">
            <h3><Navigation size={14} /> Координаты</h3>
            <p>{user.latitude.toFixed(5)}, {user.longitude.toFixed(5)}</p>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="profile-modal-overlay">
          <div className="profile-modal fade-in">
            <button
              className="profile-modal-close"
              onClick={() => setIsEditModalOpen(false)}
            >
              <X size={24} />
            </button>

            <h2>Редактировать профиль</h2>

            {/* Workplace Section */}
            <div className="profile-modal-section">
              <h3><Briefcase size={18} /> Место работы</h3>
              <form onSubmit={handleUpdateWorkplace} style={{ display: 'flex', gap: '12px' }}>
                <input
                  className="input"
                  placeholder="Компания или проект..."
                  aria-label="Название компании"
                  value={newWorkplace}
                  onChange={e => setNewWorkplace(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  disabled={isSubmitting}
                  className="btn profile-edit-btn"
                >
                  {isSubmitting ? 'Сохранение...' : 'Обновить'}
                </button>
              </form>
            </div>

            {/* Location Section */}
            <div className="profile-modal-section">
              <h3><MapPin size={18} /> Позиция на карте</h3>
              <p>Выберите вашу текущую локацию. Это обновит вашу точку на главной карте.</p>
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
                    alert('Локация обновлена');
                  } catch (err) {
                    alert('Ошибка при обновлении локации');
                  }
                }}
              />
            </div>

            <div className="profile-modal-actions">
              <button
                className="btn profile-modal-done-btn"
                onClick={() => setIsEditModalOpen(false)}
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
