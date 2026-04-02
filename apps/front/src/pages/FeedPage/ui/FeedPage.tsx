import React, { useEffect, useState } from 'react';
import { PlayCircle, Clock, Plus, Trash2, Upload, Music, ShieldCheck } from 'lucide-react';
import { podcastApi } from '@/features/Podcast/api/podcastApi';
import { Podcast } from '@/entities/User/model/types';
import { usePodcast } from '@/app/providers/PodcastProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { ConfirmModal } from '@/shared/ui/ConfirmModal/ConfirmModal';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

function pluralizeRu(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export const FeedPage: React.FC = () => {
  const isMobile = useIsMobile();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { currentPodcast, isPlaying, playPodcast } = usePodcast();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadPodcasts = async () => {
    try {
      setIsLoading(true);
      const data = await podcastApi.list();
      setPodcasts(data);
    } catch (err) {
      console.error('Failed to load podcasts', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPodcasts();
  }, []);

  const handlePlay = async (podcast: Podcast) => {
    await playPodcast(podcast);
  };

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await podcastApi.adminDelete(confirmDeleteId);
      setPodcasts((curr) => curr.filter((p) => p.id !== confirmDeleteId));
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      let resolved = false;

      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        URL.revokeObjectURL(url);
        audio.src = '';
        audio.remove();
      };

      audio.onloadedmetadata = () => {
        resolve(audio.duration);
        cleanup();
      };
      audio.onerror = () => {
        resolve(0);
        cleanup();
      };
      audio.src = url;
    });
  };

  const handleCreateAndUpload = async () => {
    if (!newTitle || !selectedFile) return;
    setIsUploading(true);
    try {
      const duration = await getAudioDuration(selectedFile);
      
      // 1. Create podcast entry (title)
      const podcast = await podcastApi.adminCreate(newTitle);
      
      // 2. Prepare upload (get pre-signed URL)
      const { uploadUrl, objectKey } = await podcastApi.prepareUpload({
        podcastId: podcast.id,
        fileName: selectedFile.name,
        contentType: selectedFile.type,
        durationSeconds: duration,
      });
      
      // 3. Direct upload to S3/MinIO
      await podcastApi.directUpload(uploadUrl, selectedFile);
      
      // 4. Complete upload
      await podcastApi.completeUpload({
        podcastId: podcast.id,
        fileName: selectedFile.name,
        contentType: selectedFile.type,
        durationSeconds: duration,
        objectKey,
      });

      setNewTitle('');
      setSelectedFile(null);
      setIsAdminPanelOpen(false);
      void loadPodcasts();
    } catch (err) {
      console.error('Upload failed', err);
      alert('Ошибка при загрузке подкаста');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fade-in feed-page" style={{ paddingBottom: isMobile ? '24px' : '40px' }}>
      <section className="page-header code-rooms-hero feed-hero">
        <div className="code-rooms-hero__copy">
          {!isMobile && <span className="code-rooms-kicker">Community Broadcasts</span>}
          <h1>{isMobile ? 'Фид' : 'Подкасты'}</h1>
          <p className="code-rooms-subtitle">
            {isMobile 
              ? 'Голос сообщества и новости.' 
              : 'Голос сообщества: короткие выпуски, локальные новости и внутренние эфиры.'}
          </p>
        </div>

        {isAuthenticated && currentUser?.isAdmin && (
          <button
            className="btn btn-primary feed-hero__admin-btn"
            onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
          >
            {isAdminPanelOpen ? 'Закрыть форму' : <><Plus size={20} /> Добавить выпуск</>}
          </button>
        )}
      </section>

      {isAuthenticated && currentUser?.isAdmin && isAdminPanelOpen && (
        <div className="card fade-in feed-admin-panel" style={{ padding: isMobile ? '20px' : '32px' }}>
          <div className="feed-admin-panel__head" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', color: 'var(--accent-color)' }}>
            <ShieldCheck size={20} />
            <h3 style={{ fontSize: '20px', fontWeight: 700 }}>Публикация подкаста</h3>
          </div>

          <div className="feed-admin-panel__grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
            <div className="feed-admin-panel__field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '4px' }}>Название выпуска</label>
              <input
                className="input"
                placeholder="Например: Новости района #42"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px' }}
              />
            </div>

            <div className="feed-admin-panel__field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '4px' }}>Аудиофайл (MP3)</label>
              <div className="feed-admin-panel__upload" style={{ position: 'relative' }}>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', zIndex: 2 }}
                />
                <div style={{
                  padding: '12px 16px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '14px',
                  textAlign: 'left',
                  background: 'rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: selectedFile ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}>
                  <Upload size={18} />
                  <span style={{ fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedFile ? selectedFile.name : 'Выбрать файл...'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary hover-scale"
            disabled={!newTitle || !selectedFile || isUploading}
            onClick={handleCreateAndUpload}
            style={{
              marginTop: '24px',
              width: '100%',
              height: '56px',
              fontSize: '16px',
              fontWeight: 700,
              borderRadius: '18px',
              background: 'linear-gradient(90deg, var(--accent-color), #818cf8)'
            }}
          >
            {isUploading ? 'Идет загрузка...' : 'Опубликовать для сообщества'}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="feed-list feed-list--loading" style={{ display: 'grid', gap: '16px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ height: '96px', opacity: 0.3, animation: 'pulse 2s infinite' }} />
          ))}
        </div>
      ) : (
        <div className="feed-list">
          {podcasts.length === 0 ? (
            <div className="card feed-empty-state" style={{ padding: isMobile ? '40px 20px' : '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Music size={48} style={{ opacity: 0.1, marginBottom: '20px' }} />
              <p style={{ fontSize: isMobile ? '16px' : '18px' }}>Пока подкастов нет.</p>
            </div>
          ) : (
            podcasts.map(p => {
              const isActive = currentPodcast?.id === p.id;
              const listensCount = Number(p.listens_count || 0);

              return (
                <div key={p.id} className={`card fade-in feed-podcast-card ${isActive ? 'is-active' : ''}`}>
                  <button
                    onClick={() => handlePlay(p)}
                    className="feed-podcast-card__play hover-scale"
                    style={{
                      backgroundColor: isActive && isPlaying ? 'white' : 'var(--accent-color)',
                      color: isActive && isPlaying ? 'black' : 'white',
                      border: 'none',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: isMobile ? '56px' : '64px',
                      height: isMobile ? '56px' : '64px',
                      cursor: 'pointer',
                      boxShadow: isActive && isPlaying ? '0 0 30px rgba(79, 70, 229, 0.4)' : '0 10px 20px rgba(0,0,0,0.2)',
                    }}
                  >
                    {isActive && isPlaying ? (
                      <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '24px' }}>
                        <div style={{ width: '4px', background: 'currentColor', borderRadius: '2px', animation: 'musicBar 0.8s ease-in-out infinite' }} />
                        <div style={{ width: '4px', background: 'currentColor', borderRadius: '2px', animation: 'musicBar 1.2s ease-in-out infinite 0.2s', height: '18px' }} />
                        <div style={{ width: '4px', background: 'currentColor', borderRadius: '2px', animation: 'musicBar 0.9s ease-in-out infinite 0.4s', height: '14px' }} />
                      </div>
                    ) : (
                      <PlayCircle size={36} fill={isActive ? 'none' : 'currentColor'} />
                    )}
                  </button>

                  <div className="feed-podcast-card__body" style={{ flex: 1 }}>
                    <div className="feed-podcast-card__title-row" style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '700' }}>{p.title}</h3>
                      {isActive && <div className="feed-podcast-card__live-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)', boxShadow: '0 0 10px var(--accent-color)', animation: 'pulse 2s infinite' }} />}
                    </div>
                    <div className="feed-podcast-card__meta" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: isMobile ? '6px' : '16px', color: 'var(--text-secondary)', fontSize: isMobile ? '13px' : '15px' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.author_name}</span>
                      <span style={{ opacity: 0.3 }}>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={isMobile ? 14 : 16} /> {formatDuration(p.duration_seconds)}
                      </span>
                      {(!isMobile || listensCount > 0) && (
                        <>
                          <span style={{ opacity: 0.3 }}>•</span>
                          <span>{listensCount} {isMobile ? '🎧' : pluralizeRu(listensCount, 'прослушивание', 'прослушивания', 'прослушиваний')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {(currentUser?.isAdmin || currentUser?.id === p.author_id) && (
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="feed-podcast-card__delete"
                      style={{
                        color: 'rgba(239, 68, 68, 0.4)',
                        background: 'transparent',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.4)'}
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      <div className="feed-notes-section">
        <h2 className="feed-notes-section__title">Посты сообщества</h2>
        <div className="card feed-notes-placeholder" style={{ padding: isMobile ? '32px 20px' : '48px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '14px' : '16px' }}>
            {isMobile ? 'Скоро здесь появятся текстовые заметки.' : 'Скоро здесь появятся текстовые заметки и фотографии от ваших соседей.'}
          </p>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Удалить подкаст?"
        message="Это действие нельзя отменить. Подкаст будет навсегда удален из ленты сообщества."
        confirmText="Удалить навсегда"
        cancelText="Отмена"
        isDangerous={true}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};
