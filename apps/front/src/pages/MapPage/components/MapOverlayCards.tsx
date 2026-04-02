import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound, X, MapPin, Calendar, Users, ExternalLink, Trash2 } from 'lucide-react';
import { CommunityMapPoint, CommunityEvent } from '@/entities/User/model/types';
import { DisplayUserPoint, EventDraft } from './types';
import { EventForm } from '@/shared/ui/EventForm/EventForm';

interface UserDetailCardProps {
  user: DisplayUserPoint;
  onClose: () => void;
}

export const UserDetailCard: React.FC<UserDetailCardProps> = ({ user, onClose }) => {
  const navigate = useNavigate();
  return (
    <div
      className="card fade-in map-overlay-card map-overlay-card--user"
    >
      <div className="map-overlay-card__header">
        <div className="map-overlay-card__avatar">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={`Аватар пользователя ${user.title}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <UserRound size={20} />
          )}
        </div>
        <div className="map-overlay-card__meta">
          <div className="map-overlay-card__title">
            {user.title}
            <div style={{
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: user.activityStatus === 'online' ? '#10B981' : 
                          user.activityStatus === 'recently_active' ? '#F59E0B' : 
                          '#4b5563',
              boxShadow: user.activityStatus === 'online' ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none'
            }} />
          </div>
          <div className="map-overlay-card__subtitle">
            @{user.telegramUsername || 'user'}
            <span style={{ opacity: 0.3 }}>•</span>
            <span style={{ fontSize: '11px' }}>
              {user.activityStatus === 'online' ? 'в сети' : 
               user.activityStatus === 'recently_active' ? 'был недавно' : 'не в сети'}
            </span>
          </div>
        </div>
        <button type="button" onClick={onClose} className="map-overlay-card__icon-btn">
          <X size={18} />
        </button>
      </div>
      <div className="map-overlay-card__stack">
        <div className="map-overlay-card__row">
          <MapPin size={15} />
          {user.region}
        </div>
      </div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => navigate(user.isCurrentUser ? '/profile' : `/profile/${user.userId}`)}
        style={{ width: '100%' }}
      >
        Перейти в профиль
      </button>
    </div>
  );
};

interface EventDetailCardProps {
  event: CommunityEvent;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  draft: EventDraft | null;
  setDraft: React.Dispatch<React.SetStateAction<EventDraft | null>>;
  onClose: () => void;
  onExpand: (id: string) => void;
  onSave: (draft: EventDraft) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onJoinToggle: (event: CommunityEvent) => Promise<void>;
  isSaving: boolean;
  error?: string;
  fieldErrors?: {
    title?: string;
    scheduledAt?: string;
    meetingLink?: string;
  };
  users: CommunityMapPoint[];
  inviteSearchQuery: string;
  setInviteSearchQuery: (q: string) => void;
}

function formatEventDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export const EventDetailCard: React.FC<EventDetailCardProps> = ({
  event,
  isEditing,
  setIsEditing,
  draft,
  setDraft,
  onClose,
  onExpand,
  onSave,
  onDelete,
  onJoinToggle,
  isSaving,
  error,
  fieldErrors,
  users,
  inviteSearchQuery,
  setInviteSearchQuery,
}) => {
  if (isEditing && draft) {
    return (
      <div className="hide-scrollbar map-overlay-card map-overlay-card--editor">
        <EventForm
          title="Редактировать событие"
          draft={draft}
          setDraft={setDraft}
          onClose={() => setIsEditing(false)}
          onSubmit={() => onSave(draft)}
          isSaving={isSaving}
          error={error}
          fieldErrors={fieldErrors}
          users={users}
          inviteSearchQuery={inviteSearchQuery}
          setInviteSearchQuery={setInviteSearchQuery}
        />
      </div>
    );
  }

  return (
    <div
      className="card fade-in hide-scrollbar map-overlay-card map-overlay-card--event"
    >
      <div className="map-overlay-card__header map-overlay-card__header--event">
        <div className="map-overlay-card__meta">
          <div className="map-overlay-card__title map-overlay-card__title--event">{event.title}</div>
          <div className="map-overlay-card__subtitle">
            Организатор: <span style={{ color: 'var(--text-primary)' }}>{event.creator_name}</span>
          </div>
        </div>
        <div className="map-overlay-card__actions">
          {event.is_creator && (
            <button
              onClick={() => {
                if (confirm('Вы уверены, что хотите удалить это событие?')) {
                  void onDelete(event.id);
                }
              }}
              className="map-overlay-card__icon-btn map-overlay-card__icon-btn--danger"
              title="Удалить"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button onClick={onClose} className="map-overlay-card__icon-btn">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="map-overlay-card__stack">
        <div className="map-overlay-card__row">
          <Calendar size={16} color="#aaa" />
          {formatEventDate(event.scheduled_at)}
        </div>
        {event.latitude !== undefined && event.latitude !== null && (
          <div className="map-overlay-card__row">
            <MapPin size={16} color="#aaa" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.place_label}</span>
          </div>
        )}
      </div>

      {event.description && (
        <div className="map-overlay-card__description">
          {event.description}
        </div>
      )}

      {event.meeting_link && event.is_joined && (
        <a
          href={event.meeting_link.startsWith('http') ? event.meeting_link : `https://${event.meeting_link}`}
          target="_blank" rel="noopener noreferrer" className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px', background: '#10B981', fontWeight: 600, borderRadius: '12px', textDecoration: 'none', height: '48px' }}
        >
          <ExternalLink size={18} />
          Присоединиться к созвону
        </a>
      )}

      <div className="map-overlay-card__row" style={{ marginBottom: '20px' }}>
        <Users size={16} color="#888" />
        <span><strong style={{ color: 'var(--text-primary)' }}>{event.participants.length}</strong> участников</span>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" className="btn btn-primary" onClick={() => onExpand(event.id)} style={{ flex: 1, minWidth: '120px', height: '48px', borderRadius: '12px', fontWeight: 600 }}>
          Подробнее
        </button>
        {event.is_creator ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setDraft({ ...event, invited_user_ids: event.participants.map(p => p.user_id) });
              setIsEditing(true);
            }}
            style={{ minWidth: '80px', height: '48px', borderRadius: '12px', fontWeight: 600 }}
          >
            Ред.
          </button>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => void onJoinToggle(event)} style={{ flex: 1, minWidth: '120px', height: '48px', borderRadius: '12px', fontWeight: 600 }}>
            {event.is_joined ? 'Выйти' : 'Участвовать'}
          </button>
        )}
      </div>
    </div>
  );
};
