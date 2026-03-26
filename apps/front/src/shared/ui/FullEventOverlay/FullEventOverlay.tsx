import React from 'react';
import { Calendar, MapPin, ExternalLink, X, Trash2 } from 'lucide-react';
import { CommunityEvent } from '@/entities/User/model/types';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

interface FullEventOverlayProps {
  eventId: string | null;
  events: CommunityEvent[];
  onClose: () => void;
  isAdmin?: boolean;
  onDelete?: (id: string) => void | Promise<void>;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatEventDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export const FullEventOverlay: React.FC<FullEventOverlayProps> = ({
  eventId,
  events,
  onClose,
  isAdmin,
  onDelete,
}) => {
  const isMobile = useIsMobile();
  if (!eventId) return null;
  const fullEvent = events.find((e) => e.id === eventId);
  if (!fullEvent) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(24px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        className="card fade-in"
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'rgba(24, 24, 27, 0.98)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 40px 100px rgba(0, 0, 0, 0.8)',
          position: 'relative',
          padding: isMobile ? '24px' : '40px',
          borderRadius: isMobile ? '24px' : '32px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: 'absolute',
            top: isMobile ? '18px' : '24px',
            left: isMobile ? '18px' : '24px',
            right: isMobile ? '18px' : '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          {(fullEvent.is_creator || isAdmin) && onDelete ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(fullEvent.id);
                onClose();
              }}
              style={{
                pointerEvents: 'auto',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.16)',
                color: '#ef4444',
                padding: '10px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title="Удалить событие"
              className="hover-scale"
              onMouseEnter={(event) => {
                event.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)';
                event.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.32)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                event.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.16)';
              }}
            >
              <Trash2 size={18} />
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            style={{
              pointerEvents: 'auto',
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              width: '44px',
              height: '44px',
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            className="hover-scale"
            onMouseEnter={(event) => {
              event.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              event.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              event.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <X size={22} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '24px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
               <Calendar size={32} color="#888" />
            </div>

            <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.02em' }}>
              {fullEvent.title}
            </h2>
            <div style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
              Организатор: <span style={{ color: 'white', fontWeight: 500 }}>{fullEvent.creator_name}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={20} color="#aaa" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Дата и время</span>
                <span style={{ fontSize: '15px', fontWeight: 500 }}>{formatEventDate(fullEvent.scheduled_at)}</span>
              </div>
            </div>
            {fullEvent.latitude !== undefined && fullEvent.latitude !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={20} color="#aaa" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Локация</span>
                  <span style={{ fontSize: '15px', fontWeight: 500 }}>{fullEvent.place_label}</span>
                </div>
              </div>
            )}
          </div>

          {fullEvent.description && (
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Описание</h3>
              <div style={{ lineHeight: 1.8, color: 'var(--text-secondary)', fontSize: '15px', whiteSpace: 'pre-wrap' }}>
                {fullEvent.description}
              </div>
            </div>
          )}

          {fullEvent.meeting_link && fullEvent.is_joined && (
            <a
              href={fullEvent.meeting_link.startsWith('http') ? fullEvent.meeting_link : `https://${fullEvent.meeting_link}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{
                padding: '20px',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                background: '#10B981',
                borderRadius: '20px',
                textDecoration: 'none',
                fontWeight: 700,
                boxShadow: '0 10px 30px rgba(16, 185, 129, 0.2)',
              }}
            >
              <ExternalLink size={20} />
              Присоединиться к встрече
            </a>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 8px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Участники</h3>
              <div style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '4px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 }}>
                {fullEvent.participants.length}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {fullEvent.participants.map((p) => (
                <div
                  key={p.user_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '12px', overflow: 'hidden', background: '#333', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {getInitials(p.title)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
