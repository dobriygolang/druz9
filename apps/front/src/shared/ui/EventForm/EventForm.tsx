import React from 'react';
import { X, Search, UserRound, MapPin, Calendar } from 'lucide-react';
import { CommunityMapPoint } from '@/entities/User/model/types';
import { EventDraft } from '@/pages/MapPage/components/types';
import { EVENT_COLOR_OPTIONS } from '@/features/Event/lib/eventMetadata';
import { FancySelect } from '@/shared/ui/FancySelect';

type EventFieldErrors = {
  title?: string;
  scheduledAt?: string;
  meetingLink?: string;
};

interface EventFormProps {
  title: string;
  draft: EventDraft;
  setDraft: React.Dispatch<React.SetStateAction<EventDraft | null>>;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  isSaving: boolean;
  error?: string;
  fieldErrors?: EventFieldErrors;
  users: CommunityMapPoint[];
  inviteSearchQuery: string;
  setInviteSearchQuery: (query: string) => void;
}

export const EventForm: React.FC<EventFormProps> = ({
  title,
  draft,
  setDraft,
  onClose,
  onSubmit,
  isSaving,
  error,
  fieldErrors,
  users,
  inviteSearchQuery,
  setInviteSearchQuery,
}) => {
  const filteredInvitees = users.filter((user) => {
    const search = inviteSearchQuery.toLowerCase();
    return (
      user.title.toLowerCase().includes(search) ||
      user.telegramUsername?.toLowerCase().includes(search) ||
      user.region?.toLowerCase().includes(search)
    );
  });

  const toggleInvitee = (userId: string) => {
    setDraft((curr) => {
      if (!curr) return null;
      const included = curr.invited_user_ids.includes(userId);
      return {
        ...curr,
        invited_user_ids: included
          ? curr.invited_user_ids.filter((id) => id !== userId)
          : [...curr.invited_user_ids, userId],
      };
    });
  };

  return (
    <div
      className="card fade-in event-form-panel"
      style={{
        zIndex: 10,
        backgroundColor: 'rgba(24, 24, 27, 0.98)',
        backdropFilter: 'blur(24px)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '16px',
          flexShrink: 0,
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{title}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.4 }}>
            Заполните детали и пригласите участников.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="event-form-panel__close"
        >
          <X size={18} />
        </button>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflowY: 'auto',
        paddingRight: '6px',
        maxHeight: '60vh',
      }}>
        <input
          className="input"
          placeholder="Название события"
          value={draft.title}
          onChange={(e) => setDraft(curr => curr ? { ...curr, title: e.target.value } : null)}
          style={{
            background: 'rgba(0,0,0,0.2)',
            height: '44px',
            borderColor: fieldErrors?.title ? '#ef4444' : undefined,
          }}
        />
        {fieldErrors?.title && (
          <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '-6px' }}>
            {fieldErrors.title}
          </div>
        )}
        <textarea
          className="input"
          placeholder="Описание события (опционально)"
          value={draft.description}
          onChange={(e) => setDraft(curr => curr ? { ...curr, description: e.target.value } : null)}
          style={{ minHeight: '80px', resize: 'vertical', background: 'rgba(0,0,0,0.2)', padding: '12px' }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: '10px' }}>
          <input
            className="input"
            placeholder="Группа / клуб"
            value={draft.event_group ?? ''}
            onChange={(e) => setDraft(curr => curr ? { ...curr, event_group: e.target.value } : null)}
            style={{ background: 'rgba(0,0,0,0.2)', height: '44px' }}
          />
          <input
            className="input"
            placeholder="Тип ивента"
            value={draft.event_type ?? ''}
            onChange={(e) => setDraft(curr => curr ? { ...curr, event_type: e.target.value } : null)}
            style={{ background: 'rgba(0,0,0,0.2)', height: '44px' }}
          />
          <FancySelect
            value={draft.event_color ?? 'violet'}
            onChange={(value) => setDraft(curr => curr ? { ...curr, event_color: value as EventDraft['event_color'] } : null)}
            options={EVENT_COLOR_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          />
        </div>
          <input
            className="input"
            placeholder="Ссылка на созвон (опционально)"
            value={draft.meeting_link}
            onChange={(e) => setDraft(curr => curr ? { ...curr, meeting_link: e.target.value } : null)}
            style={{
              background: 'rgba(0,0,0,0.2)',
              height: '44px',
              borderColor: fieldErrors?.meetingLink ? '#ef4444' : undefined,
            }}
          />
          {fieldErrors?.meetingLink && (
            <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '-6px' }}>
              {fieldErrors.meetingLink}
            </div>
          )}
        
        {/* Coordinates Section - Optional */}
        {(draft.latitude !== undefined && draft.longitude !== undefined) ? (
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <MapPin size={16} color="#888" />
            <div style={{ flex: 1 }}>
              <input
                className="input-minimal"
                value={draft.place_label}
                onChange={(e) => setDraft(curr => curr ? { ...curr, place_label: e.target.value } : null)}
                placeholder="Местоположение"
                style={{ background: 'transparent', border: 'none', color: 'white', padding: 0, width: '100%' }}
              />
              <div style={{ fontSize: '11px', opacity: 0.6 }}>{draft.latitude.toFixed(4)}, {draft.longitude.toFixed(4)}</div>
            </div>
          </div>
        ) : (
          <input
            className="input"
            placeholder="Местоположение (опционально)"
            value={draft.place_label}
            onChange={(e) => setDraft(curr => curr ? { ...curr, place_label: e.target.value } : null)}
            style={{ background: 'rgba(0,0,0,0.2)', height: '44px' }}
          />
        )}

        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}>
            <Calendar size={16} color="#888" />
          </div>
          <input
            className="input"
            type="datetime-local"
            value={draft.scheduled_at}
            onChange={(e) => setDraft(curr => curr ? { ...curr, scheduled_at: e.target.value } : null)}
            style={{ 
              background: 'rgba(0,0,0,0.2)', 
              height: '44px', 
              colorScheme: 'dark', 
              paddingLeft: '38px',
              fontFamily: 'inherit',
              borderColor: fieldErrors?.scheduledAt ? '#ef4444' : undefined,
            }}
          />
        </div>
        {fieldErrors?.scheduledAt && (
          <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '-6px' }}>
            {fieldErrors.scheduledAt}
          </div>
        )}

        <div style={{ marginTop: '4px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>Пригласить участников</div>
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '8px 12px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Search size={14} color="#666" />
            <input
              value={inviteSearchQuery}
              onChange={(e) => setInviteSearchQuery(e.target.value)}
              placeholder="Поиск..."
              style={{ border: 'none', background: 'transparent', color: 'white', fontSize: '14px', outline: 'none', flex: 1 }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
            {filteredInvitees.map((user) => (
              <button
                key={user.userId}
                type="button"
                onClick={() => toggleInvitee(user.userId)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  background: draft.invited_user_ids.includes(user.userId) ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)',
                  color: draft.invited_user_ids.includes(user.userId) ? 'white' : '#aaa',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#333', overflow: 'hidden', flexShrink: 0 }}>
                  {user.avatarUrl ? <img src={user.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserRound size={10} />}
                </div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.title}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{error}</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexShrink: 0 }}>
        <button
          type="button"
          className="btn"
          onClick={onSubmit}
          disabled={isSaving}
          style={{ flex: 1, height: '48px', borderRadius: '12px', fontWeight: 600 }}
        >
          {isSaving ? 'Сохранение...' : (title === 'Новое событие' ? 'Создать событие' : 'Сохранить изменения')}
        </button>
      </div>
    </div>
  );
};
