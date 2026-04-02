import React from 'react';
import { Calendar, MapPin, ExternalLink, X, Trash2, Sparkles } from 'lucide-react';
import { CommunityEvent } from '@/entities/User/model/types';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { getEventColorSpec } from '@/features/Event/lib/eventMetadata';

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

function hasLocation(event: CommunityEvent) {
  return Boolean(
    event.place_label?.trim() ||
    event.latitude !== undefined && event.latitude !== null ||
    event.longitude !== undefined && event.longitude !== null,
  );
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

  const canDelete = Boolean((fullEvent.is_creator || isAdmin) && onDelete);
  const accent = getEventColorSpec(fullEvent.event_color);

  return (
    <div className="event-overlay" onClick={onClose}>
      <div
        className={`event-overlay__dialog fade-in ${isMobile ? 'event-overlay__dialog--mobile' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="event-overlay__topbar">
          {canDelete ? (
            <button
              type="button"
              className="event-overlay__danger"
              onClick={() => {
                void onDelete?.(fullEvent.id);
                onClose();
              }}
              title="Удалить событие"
            >
              <Trash2 size={18} />
            </button>
          ) : (
            <div />
          )}

          <button type="button" className="event-overlay__close" onClick={onClose} aria-label="Закрыть">
            <X size={22} />
          </button>
        </div>

        <div className="event-overlay__hero">
          <div className="event-overlay__icon-shell">
            <Calendar size={30} />
          </div>
          <div className="event-overlay__eyebrow">
            <Sparkles size={14} />
            Событие сообщества
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {fullEvent.event_group && (
              <span style={{ padding: '6px 10px', borderRadius: '999px', background: accent.soft, color: 'white', fontSize: '12px', border: `1px solid ${accent.solid}` }}>
                {fullEvent.event_group}
              </span>
            )}
            {fullEvent.event_type && (
              <span style={{ padding: '6px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', fontSize: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                {fullEvent.event_type}
              </span>
            )}
          </div>
          <h2 className="event-overlay__title">{fullEvent.title}</h2>
          <p className="event-overlay__organizer">
            Организатор: <span>{fullEvent.creator_name}</span>
          </p>
        </div>

        <div className="event-overlay__meta-grid">
          <div className="event-overlay__meta-card">
            <div className="event-overlay__meta-icon">
              <Calendar size={18} />
            </div>
            <div>
              <div className="event-overlay__meta-label">Дата и время</div>
              <div className="event-overlay__meta-value">{formatEventDate(fullEvent.scheduled_at)}</div>
            </div>
          </div>

          {hasLocation(fullEvent) && (
            <div className="event-overlay__meta-card">
              <div className="event-overlay__meta-icon">
                <MapPin size={18} />
              </div>
              <div>
                <div className="event-overlay__meta-label">Локация</div>
                <div className="event-overlay__meta-value">{fullEvent.place_label || 'Онлайн / будет уточнено'}</div>
              </div>
            </div>
          )}
        </div>

        {fullEvent.description && (
          <section className="event-overlay__section">
            <div className="event-overlay__section-title">Описание</div>
            <div className="event-overlay__description">{fullEvent.description}</div>
          </section>
        )}

        {fullEvent.meeting_link && fullEvent.is_joined && (
          <a
            href={fullEvent.meeting_link.startsWith('http') ? fullEvent.meeting_link : `https://${fullEvent.meeting_link}`}
            target="_blank"
            rel="noopener noreferrer"
            className="event-overlay__join"
          >
            <ExternalLink size={18} />
            Перейти к встрече
          </a>
        )}

        <section className="event-overlay__section">
          <div className="event-overlay__section-head">
            <div className="event-overlay__section-title">Участники</div>
            <div className="event-overlay__counter">{fullEvent.participants.length}</div>
          </div>

          <div className="event-overlay__participants">
            {fullEvent.participants.map((participant) => {
              const avatarUrl = participant.avatar_url || '';
              return (
                <div key={participant.user_id} className="event-overlay__participant">
                  <div className="event-overlay__avatar">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={`Аватар пользователя ${participant.title}`} />
                    ) : (
                      <div className="event-overlay__avatar-fallback">{getInitials(participant.title)}</div>
                    )}
                  </div>
                  <div className="event-overlay__participant-text">
                    <div className="event-overlay__participant-name">{participant.title}</div>
                    <div className="event-overlay__participant-role">
                      {participant.status === 'joined' ? 'Подтвердил участие' : participant.status === 'declined' ? 'Отказался' : 'Приглашён'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
