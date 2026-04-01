import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, MapPin, Pencil, Briefcase, Shield, X, Navigation, Trophy, Crown, Medal, Zap, Diamond, Send, Upload, User as UserIcon, Camera } from 'lucide-react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { useAuth } from '@/app/providers/AuthProvider';
import { User } from '@/entities/User/model/types';
import { adminApi } from '@/features/Admin/api/adminApi';
import { authApi } from '@/features/Auth/api/authApi';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { ArenaPlayerStats } from '@/entities/CodeRoom/model/types';
import { LocationPicker } from '@/features/Geo/ui/LocationPicker';

// Helper to create aspect-crop centered
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}
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
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [isBindTelegramModalOpen, setIsBindTelegramModalOpen] = useState(false);
  const [telegramChallenge, setTelegramChallenge] = useState<{ token: string; botStartUrl: string } | null>(null);
  const [telegramCode, setTelegramCode] = useState('');
  const [isBindingTelegram, setIsBindingTelegram] = useState(false);
  const [trustedUpdating, setTrustedUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Crop state
  const [srcImage, setSrcImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropping, setIsCropping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Generate cropped image as blob
  const getCroppedImage = async (): Promise<Blob | null> => {
    if (!imgRef.current || !completedCrop) return null;

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
    });
  };

  // Reset crop state
  const resetCrop = () => {
    setSrcImage(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setIsCropping(false);
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

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser || !isOwnProfile) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast('Можно загрузить только изображение', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Максимальный размер изображения 10MB', 'error');
      return;
    }

    // Create object URL for cropping preview
    const reader = new FileReader();
    reader.onload = () => {
      setSrcImage(reader.result as string);
      setIsCropping(true);
      setCrop(undefined);
      setCompletedCrop(undefined);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Process file - shared logic for click and drag & drop
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Можно загрузить только изображение', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Максимальный размер изображения 10MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSrcImage(reader.result as string);
      setIsCropping(true);
      setCrop(undefined);
      setCompletedCrop(undefined);
    };
    reader.readAsDataURL(file);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  // Handle cropped image upload
  const handleCropUpload = async () => {
    if (!srcImage) return;

    try {
      setIsPhotoUploading(true);

      // Get cropped blob
      const blob = await getCroppedImage();
      if (!blob) {
        throw new Error('Failed to create cropped image');
      }

      // Create file from blob
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });

      // Get presigned URL
      const resp = await authApi.getPhotoUploadURL(file.name, file.type);
      const upload_url = (resp as any).uploadUrl || (resp as any).upload_url;
      const object_key = (resp as any).objectKey || (resp as any).object_key;

      if (!upload_url) {
        throw new Error('upload_url is empty');
      }

      // Upload
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      if (!uploadResponse.ok) {
        throw new Error(`upload failed: ${uploadResponse.status}`);
      }

      // Complete upload
      const response = await authApi.completePhotoUpload(object_key);
      setUser(response.user);
      resetCrop();
      showToast('Фото профиля обновлено!', 'success');
    } catch (err) {
      console.error('Failed to upload profile photo', err);
      showToast('Не удалось обновить фото профиля', 'error');
    } finally {
      setIsPhotoUploading(false);
    }
  };

  // Handle remove avatar
  const handleRemoveAvatar = async () => {
    if (!confirm('Вы уверены, что хотите удалить фото профиля?')) {
      return;
    }

    try {
      setIsPhotoUploading(true);
      // TODO: Add API call to remove avatar when backend supports it
      // For now, just show a message
      showToast('Функция удаления аватара временно недоступна', 'info');
    } catch (err) {
      console.error('Failed to remove avatar', err);
      showToast('Не удалось удалить фото профиля', 'error');
    } finally {
      setIsPhotoUploading(false);
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

      <div className="profile-header">
        <h1>Профиль</h1>
        {isOwnProfile && (
          <button
            className="btn"
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

          {currentUser?.isAdmin && user?.id && (
            <button
              className="btn"
              style={{ padding: '4px 8px', fontSize: '12px' }}
              disabled={trustedUpdating}
              onClick={async () => {
                try {
                  setTrustedUpdating(true);
                  await adminApi.setUserTrusted(user.id, !user.isTrusted);
                  // Refresh user profile
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

          {isOwnProfile && user.telegramId && user.telegramId !== '0' ? (
            <span className="profile-badge" style={{ background: 'var(--success)', color: 'white' }}>
              <CheckCircle size={14} />
              Telegram привязан
            </span>
          ) : (
            <button
              className="btn profile-telegram-btn"
              onClick={handleOpenBindTelegram}
            >
              <Send size={12} />
              Привязать Telegram
            </button>
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
              onClick={() => { setIsEditModalOpen(false); resetCrop(); }}
            >
              <X size={24} />
            </button>

            <h2>Редактировать профиль</h2>

            <div className="profile-modal-section">
              <h3>Фотография профиля</h3>

              {/* Avatar preview with edit hint - drag & drop enabled */}
              {!isCropping && (
                <div
                  className={`profile-photo-edit ${isDragging ? 'profile-photo-edit--dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="profile-photo-edit__main">
                    <div className="profile-photo-preview">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="Текущий аватар" />
                      ) : (
                        <div className="profile-photo-placeholder">
                          <UserIcon size={32} />
                        </div>
                      )}
                      <div className="profile-photo-overlay" onClick={() => fileInputRef.current?.click()}>
                        <Camera size={20} />
                        <span>Сменить</span>
                      </div>
                    </div>
                    <div className="profile-photo-actions">
                      <button
                        type="button"
                        className="btn profile-photo-upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={16} /> Загрузить фото
                      </button>
                      {user.avatarUrl && (
                        <button
                          type="button"
                          className="btn profile-photo-remove-btn"
                          onClick={handleRemoveAvatar}
                        >
                          <X size={16} /> Удалить
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="profile-photo-hints">
                    <p>Нажмите на фото или кнопку для загрузки</p>
                    <p className="profile-photo-requirements">JPG, PNG или WebP. Макс. 10MB. Рекомендуется квадратное фото.</p>
                  </div>
                </div>
              )}

              {isCropping && srcImage && (
                <div className="photo-crop-container">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={1}
                    circularCrop
                  >
                    <img
                      ref={imgRef}
                      src={srcImage}
                      alt="Crop preview"
                      style={{ maxHeight: '300px', maxWidth: '100%' }}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        imgRef.current = img;
                        const { width, height } = img;
                        setCrop(centerAspectCrop(width, height, 1));
                      }}
                    />
                  </ReactCrop>
                  <p className="crop-hint">
                    Перемещайте и масштабируйте область, чтобы выбрать нужную часть фото
                  </p>
                  <div className="photo-crop-actions">
                    <button
                      type="button"
                      className="btn"
                      onClick={resetCrop}
                      disabled={isPhotoUploading}
                    >
                      <X size={16} /> Отмена
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={handleCropUpload}
                      disabled={isPhotoUploading}
                    >
                      {isPhotoUploading ? (
                        'Загрузка...'
                      ) : (
                        <>
                          <Upload size={16} /> Загрузить
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden file input - triggered by avatar click */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                style={{ display: 'none' }}
              />
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
                  className="btn"
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
                className="btn"
                onClick={() => { setIsEditModalOpen(false); resetCrop(); }}
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
                className="btn"
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
                  className="btn"
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
