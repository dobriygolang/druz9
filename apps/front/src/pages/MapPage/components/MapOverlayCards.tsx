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
      className="card fade-in"
      style={{
        position: 'absolute',
        left: '16px',
        bottom: '16px',
        zIndex: 4,
        width: 'min(320px, calc(100% - 32px))',
        backgroundColor: 'rgba(24, 24, 27, 0.95)',
        backdropFilter: 'blur(16px)',
        padding: '24px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', background: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <UserRound size={20} />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            @{user.telegramUsername || 'user'}
            <span style={{ opacity: 0.3 }}>•</span>
            <span style={{ fontSize: '11px' }}>
              {user.activityStatus === 'online' ? 'в сети' : 
               user.activityStatus === 'recently_active' ? 'был недавно' : 'не в сети'}
            </span>
          </div>
        </div>
        <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>
      <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
          <MapPin size={15} />
          {user.region}
        </div>
      </div>
      <button
        type="button"
        className="btn"
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
  users,
  inviteSearchQuery,
  setInviteSearchQuery,
}) => {
  if (isEditing && draft) {
    return (
      <div className="hide-scrollbar" style={{
        position: 'absolute',
        left: '16px',
        bottom: '16px',
        zIndex: 5,
        width: 'min(400px, calc(100% - 32px))',
        maxHeight: 'calc(100% - 32px)',
        overflowY: 'auto',
        borderRadius: '16px',
      }}>
        <EventForm
          title="Редактировать событие"
          draft={draft}
          setDraft={setDraft}
          onClose={() => setIsEditing(false)}
          onSubmit={() => onSave(draft)}
          isSaving={isSaving}
          error={error}
          users={users}
          inviteSearchQuery={inviteSearchQuery}
          setInviteSearchQuery={setInviteSearchQuery}
        />
      </div>
    );
  }

  return (
    <div
      className="card fade-in hide-scrollbar"
      style={{
        position: 'absolute',
        left: '16px',
        bottom: '16px',
        zIndex: 4,
        width: 'min(380px, calc(100% - 32px))',
        maxHeight: 'calc(100% - 32px)',
        overflowY: 'auto',
        backgroundColor: 'rgba(24, 24, 27, 0.95)',
        backdropFilter: 'blur(16px)',
        padding: '24px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>{event.title}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Организатор: <span style={{ color: 'var(--text-primary)' }}>{event.creator_name}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {event.is_creator && (
            <button
              onClick={() => {
                if (confirm('Вы уверены, что хотите удалить это событие?')) {
                  void onDelete(event.id);
                }
              }}
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '10px' }}
              className="hover-opacity"
              title="Удалить"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px', borderRadius: '10px' }} className="hover-opacity">
            <X size={16} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
          <Calendar size={16} color="#aaa" />
          {formatEventDate(event.scheduled_at)}
        </div>
        {event.latitude !== undefined && event.latitude !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            <MapPin size={16} color="#aaa" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.place_label}</span>
          </div>
        )}
      </div>

      {event.description && (
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6, background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px' }}>
          {event.description}
        </div>
      )}

      {event.meeting_link && event.is_joined && (
        <a
          href={event.meeting_link.startsWith('http') ? event.meeting_link : `https://${event.meeting_link}`}
          target="_blank" rel="noopener noreferrer" className="btn"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px', background: '#10B981', fontWeight: 600, borderRadius: '12px', textDecoration: 'none', height: '48px' }}
        >
          <ExternalLink size={18} />
          Присоединиться к созвону
        </a>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
        <Users size={16} color="#888" />
        <span><strong style={{ color: 'var(--text-primary)' }}>{event.participants.length}</strong> участников</span>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" className="btn" onClick={() => onExpand(event.id)} style={{ flex: 1, minWidth: '120px', height: '48px', borderRadius: '12px', fontWeight: 600 }}>
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
