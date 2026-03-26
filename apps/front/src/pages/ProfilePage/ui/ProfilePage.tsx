import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, MapPin, Pencil, Briefcase, Shield, X } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { User } from '@/entities/User/model/types';
import { authApi } from '@/features/Auth/api/authApi';
import { LocationPicker } from '@/features/Geo/ui/LocationPicker';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

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
    <div className="fade-in">
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : 0, marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', margin: 0, fontWeight: '600' }}>
          Профиль
        </h1>
        {isOwnProfile && (
          <button
            className="btn"
            onClick={() => setIsEditModalOpen(true)}
            style={{
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--accent-color)',
              width: isMobile ? '100%' : 'auto',
              justifyContent: 'center',
            }}
          >
            <Pencil size={18} /> Редактировать профиль
          </button>
        )}
      </div>

      {/* Profile Header Card */}
      <div
        className="card"
        style={{
          display: 'flex',
          gap: '24px',
          alignItems: isMobile ? 'flex-start' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-color)',
            backgroundImage: user.avatarUrl ? `url(${user.avatarUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          {!user.avatarUrl && user.telegramUsername?.charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1, width: '100%' }}>
          <h2
            style={{
              fontSize: '20px',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {user.firstName || ''} {user.lastName || ''}
            {!user.firstName && !user.lastName ? user.telegramUsername : ''}
          </h2>
          <div
            style={{
              color: 'var(--accent-color)',
              marginBottom: '8px',
              fontSize: '14px',
            }}
          >
            @{user.telegramUsername}
          </div>
          <div
            style={{
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={16} /> {user.region}
            </div>

            {user.currentWorkplace && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Briefcase size={16} /> {user.currentWorkplace}
              </div>
            )}

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '4px 8px',
              borderRadius: '8px',
              background: user.activityStatus === 'online' ? 'rgba(16, 185, 129, 0.1)' : 
                          user.activityStatus === 'recently_active' ? 'rgba(245, 158, 11, 0.1)' : 
                          'rgba(156, 163, 175, 0.1)',
              color: user.activityStatus === 'online' ? '#10B981' : 
                     user.activityStatus === 'recently_active' ? '#F59E0B' : 
                     '#9CA3AF',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase'
            }}>
              <div style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: 'currentColor',
                animation: user.activityStatus === 'online' ? 'pulse 2s infinite' : 'none'
              }} />
              {user.activityStatus === 'online' ? 'В сети' : 
               user.activityStatus === 'recently_active' ? 'Был недавно' : 'Не в сети'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(79, 70, 229, 0.1)',
              color: 'var(--accent-color)',
              padding: '6px 12px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: '500',
              textTransform: 'uppercase',
            }}
          >
            <CheckCircle size={14} />
            Аккаунт
          </span>

          {user.isAdmin && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: '#F59E0B',
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              <Shield size={14} />
              Админ
            </span>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <h2
        style={{
          fontSize: '20px',
          marginTop: '40px',
          marginBottom: '16px',
          fontWeight: '500',
        }}
      >
        Данные профиля
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            Локация
          </h3>
          <p style={{ fontSize: '14px', marginBottom: '6px' }}>{user.region || 'Не указано'}</p>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            Работа
          </h3>
          <p style={{ fontSize: '14px' }}>
            {user.currentWorkplace || 'Не указано'}
          </p>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            Координаты
          </h3>
          <p style={{ fontSize: '14px' }}>
            {user.latitude.toFixed(5)}, {user.longitude.toFixed(5)}
          </p>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card fade-in" style={{
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            padding: '32px'
          }}>
            <button
              onClick={() => setIsEditModalOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <X size={24} />
            </button>

            <h2 style={{ fontSize: '24px', marginBottom: '24px', fontWeight: 600 }}>
              Редактировать профиль
            </h2>

            {/* Workplace Section */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={18} /> Место работы
              </h3>
              <form onSubmit={handleUpdateWorkplace} style={{ display: 'flex', gap: '12px' }}>
                <input 
                  className="input"
                  placeholder="Компания или проект..."
                  value={newWorkplace}
                  onChange={e => setNewWorkplace(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button 
                  disabled={isSubmitting}
                  className="btn" 
                  style={{ background: 'var(--accent-color)', whiteSpace: 'nowrap' }}
                >
                  {isSubmitting ? 'Сохранение...' : 'Обновить'}
                </button>
              </form>
            </div>

            {/* Location Section */}
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} /> Позиция на карте
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px', lineHeight: 1.5 }}>
                Выберите вашу текущую локацию. Это обновит вашу точку на главной карте.
              </p>
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
            
            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn" 
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'rgba(255,255,255,0.1)' }}
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
