import React, { useEffect, useState } from 'react';
import { PlayCircle, Clock, Plus, Trash2, Upload, Music, Radio, ShieldCheck } from 'lucide-react';
import { podcastApi } from '@/features/Podcast/api/podcastApi';
import { Podcast } from '@/entities/User/model/types';
import { usePodcast } from '@/app/providers/PodcastProvider';
import { ConfirmModal } from '@/shared/ui/ConfirmModal/ConfirmModal';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

export const FeedPage: React.FC = () => {
  const isMobile = useIsMobile();
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
    <div className="fade-in" style={{ paddingBottom: isMobile ? '24px' : '40px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'flex-end',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '20px' : '16px',
        marginBottom: isMobile ? '28px' : '40px',
        padding: isMobile ? 0 : '0 8px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)', marginBottom: '8px', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <Radio size={16} /> Community Broadcasts
          </div>
          <h1 style={{ fontSize: isMobile ? '48px' : '36px', fontWeight: '800', letterSpacing: '-0.02em' }}>Подкасты</h1>
        </div>

        <button
          className="btn hover-scale"
          onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            justifyContent: 'center',
            width: isMobile ? '100%' : 'auto',
            padding: '12px 24px',
            borderRadius: '16px',
            background: isAdminPanelOpen ? 'rgba(255,255,255,0.05)' : 'var(--accent-color)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: isAdminPanelOpen ? 'none' : '0 10px 25px rgba(79, 70, 229, 0.3)'
          }}
        >
          {isAdminPanelOpen ? 'Закрыть панель' : <><Plus size={20} /> Добавить выпуск</>}
        </button>
      </div>

      {isAdminPanelOpen && (
        <div className="card fade-in" style={{
          marginBottom: '40px',
          padding: isMobile ? '20px' : '32px',
          background: 'rgba(79, 70, 229, 0.03)',
          border: '1px dashed var(--accent-color)',
          borderRadius: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', color: 'var(--accent-color)' }}>
            <ShieldCheck size={20} />
            <h3 style={{ fontSize: '20px', fontWeight: 700 }}>Admin: Публикация подкаста</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '4px' }}>Название выпуска</label>
              <input
                className="input"
                placeholder="Например: Новости района #42"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '4px' }}>Аудиофайл (MP3)</label>
              <div style={{ position: 'relative' }}>
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
            className="btn hover-scale"
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
        <div style={{ display: 'grid', gap: '16px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ height: '96px', opacity: 0.3, animation: 'pulse 2s infinite' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {podcasts.length === 0 ? (
            <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed rgba(255,255,255,0.05)', background: 'transparent' }}>
              <Music size={64} style={{ opacity: 0.1, marginBottom: '20px' }} />
              <p style={{ fontSize: '18px' }}>Пока никто не опубликовал подкастов.</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>Будьте первыми, кто поделится голосом!</p>
            </div>
          ) : (
            podcasts.map(p => {
              const isActive = currentPodcast?.id === p.id;

              return (
                <div
                  key={p.id}
                  className="card fade-in"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '16px' : '24px',
                    padding: isMobile ? '18px' : '24px',
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                    background: isActive ? 'rgba(79, 70, 229, 0.08)' : 'rgba(255,255,255,0.02)',
                    border: isActive ? '1px solid var(--accent-color)' : '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '24px',
                    transition: 'all 0.3s'
                  }}
                >
                  <button
                    onClick={() => handlePlay(p)}
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
                    className="hover-scale"
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

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '700' }}>{p.title}</h3>
                      {isActive && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)', boxShadow: '0 0 10px var(--accent-color)', animation: 'pulse 2s infinite' }} />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: isMobile ? '10px' : '16px', color: 'var(--text-secondary)', fontSize: isMobile ? '14px' : '15px' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.author_name}</span>
                      <span style={{ opacity: 0.3 }}>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={16} /> {formatDuration(p.duration_seconds)}
                      </span>
                      <span style={{ opacity: 0.3 }}>•</span>
                      <span>{p.listens_count} прослушиваний</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(p.id)}
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
                </div>
              );
            })
          )}
        </div>
      )}

      <div style={{ marginTop: '64px' }}>
        <h2 style={{ fontSize: isMobile ? '20px' : '24px', marginBottom: '24px', fontWeight: '700' }}>Посты сообщества</h2>
        <div className="card" style={{
          padding: isMobile ? '32px 24px' : '48px',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.01)',
          border: '1px dashed rgba(255,255,255,0.08)',
          borderRadius: '32px'
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
            Скоро здесь появятся текстовые заметки и фотографии от ваших соседей.
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
