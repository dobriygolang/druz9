import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2, Users, Trash2, Pencil, ExternalLink, Mic, Tv } from 'lucide-react';
import { roomApi } from '@/features/Room/api/roomApi';
import { useAuth } from '@/app/providers/AuthProvider';
import { Room, CreateRoomRequest } from '@/entities/Room/model/types';
import { ConfirmModal } from '@/shared/ui/ConfirmModal/ConfirmModal';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

export const RoomsPage: React.FC = () => {
  const isMobile = useIsMobile();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateRoomRequest>({
    title: '',
    kind: 'voice',
    description: '',
  });

  const loadRooms = async () => {
    try {
      setIsLoading(true);
      const data = await roomApi.listRooms();
      setRooms(data.rooms || []);
    } catch (err) {
      console.error('Failed to load rooms', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRooms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingRoom) {
        await roomApi.updateRoom(editingRoom.id, formData);
      } else {
        await roomApi.createRoom(formData);
      }
      setIsModalOpen(false);
      setEditingRoom(null);
      setFormData({ title: '', kind: 'voice', description: '' });
      void loadRooms();
    } catch (err) {
      console.error('Failed to save room', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await roomApi.deleteRoom(confirmDeleteId);
      void loadRooms();
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const openEdit = (room: Room) => {
      setEditingRoom(room);
      setFormData({
      title: room.title,
      kind: room.kind,
      description: room.description,
    });
    setIsModalOpen(true);
  };

  const filteredRooms = rooms.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roomKindMeta = (kind: string) => {
    if (kind === 'watch_party') {
      return {
        label: 'Совместный просмотр',
        icon: <Tv size={18} />,
        accent: '#f59e0b',
        accentBg: 'rgba(245, 158, 11, 0.12)',
      };
    }

    return {
      label: 'Голосовая',
      icon: <Mic size={18} />,
      accent: 'var(--accent-color)',
      accentBg: 'rgba(79, 70, 229, 0.12)',
    };
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '60px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '16px' : 0,
        marginBottom: '32px'
      }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>Комнаты</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Общайтесь голосом и смотрите видео вместе</p>
        </div>
        <button
          className="btn hover-scale"
          onClick={() => {
            setEditingRoom(null);
            setFormData({ title: '', kind: 'voice', description: '' });
            setIsModalOpen(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: 'center',
            width: isMobile ? '100%' : 'auto',
            padding: '12px 24px',
            borderRadius: '16px',
            background: 'var(--accent-color)',
            boxShadow: '0 10px 20px rgba(79, 70, 229, 0.2)'
          }}
        >
          <Plus size={20} /> Создать комнату
        </button>
      </div>

      <div className="card" style={{
        marginBottom: '32px',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <Search size={20} color="var(--text-secondary)" />
        <input
          placeholder="Поиск комнат по названию или описанию..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'white',
            padding: '12px 0',
            fontSize: '15px'
          }}
        />
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 className="spin" size={32} color="var(--accent-color)" />
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {filteredRooms.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', opacity: 0.5 }}>
              Нет активных комнат
            </div>
          ) : (
            filteredRooms.map(room => (
              <Link
                key={room.id}
                to={`/rooms/${room.id}`}
                className="card"
                style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '24px',
                position: 'relative',
                overflow: 'hidden',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'transform 0.2s, background-color 0.2s, border-color 0.2s',
              }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.35)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {(() => {
                  const meta = roomKindMeta(room.kind);

                  return (
                    <>
                <div style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '4px', 
                  height: '100%', 
                  background: meta.accent,
                  opacity: 0.8
                }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '8px', 
                      background: meta.accentBg, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: meta.accent
                    }}>
                      {meta.icon}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{room.title}</h3>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: meta.accent,
                          background: meta.accentBg,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {meta.label}
                      </div>
                    </div>
                  </div>
                  {(room.creatorId === currentUser?.id || currentUser?.isAdmin) && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(room); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(room.id); }}
                        style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.5)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <p style={{ 
                  fontSize: '14px', 
                  color: 'var(--text-secondary)', 
                  lineHeight: '1.5',
                  minHeight: '42px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {room.description || 'Нет описания'}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <Users size={14} />
                      {room.memberCount > 0 ? `${room.memberCount} участ.` : 'Активна'}
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/rooms/${room.id}`);
                    }}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '12px',
                      background: 'white',
                      color: 'black',
                      fontSize: '13px',
                      fontWeight: '700',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    className="hover-scale"
                  >
                    Войти <ExternalLink size={14} />
                  </button>
                </div>
                    </>
                  );
                })()}
              </Link>
            ))
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fade-in" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '500px',
            padding: '32px',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '24px' }}>
              {editingRoom ? 'Редактировать комнату' : 'Создать новую комнату'}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Название комнаты</label>
                <input
                  required
                  placeholder="Напр. Вечерний кинотеатр"
                  className="input"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Тип комнаты</label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '10px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, kind: 'voice' })}
                    style={{
                      borderRadius: '16px',
                      border:
                        formData.kind === 'voice'
                          ? '1px solid var(--accent-color)'
                          : '1px solid rgba(255,255,255,0.08)',
                      background:
                        formData.kind === 'voice'
                          ? 'rgba(79, 70, 229, 0.12)'
                          : 'rgba(255,255,255,0.03)',
                      color: 'white',
                      cursor: 'pointer',
                      padding: '14px 16px',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: 'var(--accent-color)' }}>
                      <Mic size={16} />
                      <strong>Голосовая</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Для живого голосового общения.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, kind: 'watch_party' })}
                    style={{
                      borderRadius: '16px',
                      border:
                        formData.kind === 'watch_party'
                          ? '1px solid #f59e0b'
                          : '1px solid rgba(255,255,255,0.08)',
                      background:
                        formData.kind === 'watch_party'
                          ? 'rgba(245, 158, 11, 0.12)'
                          : 'rgba(255,255,255,0.03)',
                      color: 'white',
                      cursor: 'pointer',
                      padding: '14px 16px',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: '#f59e0b' }}>
                      <Tv size={16} />
                      <strong>Совместный просмотр</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Для синхронного просмотра видео по ссылке.
                    </div>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Описание</label>
                <textarea
                  required
                  placeholder="О чем эта комната?"
                  className="input"
                  style={{ minHeight: '100px', padding: '12px' }}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.05)', flex: 1 }}
                >
                  Отмена
                </button>
                <button
                  disabled={isSubmitting}
                  className="btn"
                  style={{ background: 'var(--accent-color)', flex: 2 }}
                >
                  {isSubmitting ? 'Создание...' : editingRoom ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Удалить комнату?"
        message="Вы уверены, что хотите удалить эту комнату? Все участники будут исключены."
        confirmText="Удалить"
        cancelText="Отмена"
        isDangerous={true}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};
