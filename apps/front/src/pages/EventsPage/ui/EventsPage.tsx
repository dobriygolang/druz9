import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight,
} from 'lucide-react';

import { CommunityEvent, CommunityMapPoint, CreateEventPayload } from '@/entities/User/model/types';
import { eventApi } from '@/features/Event/api/eventApi';
import { geoApi } from '@/features/Geo/api/geoApi';
import { FullEventOverlay } from '@/shared/ui/FullEventOverlay/FullEventOverlay';
import { EventForm } from '@/shared/ui/EventForm/EventForm';
import { ConfirmModal } from '@/shared/ui/ConfirmModal/ConfirmModal';
import { EventDraft } from '@/pages/MapPage/components/types';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { AxiosError } from '@/shared/api/base';
import { getEventColorSpec } from '@/features/Event/lib/eventMetadata';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

function buildDefaultScheduledAt(baseDate?: Date) {
  const date = baseDate ? new Date(baseDate) : new Date();
  if (!baseDate) date.setHours(date.getHours() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getLocalDateKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const EventsPage: React.FC = () => {
  const isMobile = useIsMobile();
  const { user: currentUser } = useAuth();
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [points, setPoints] = useState<CommunityMapPoint[]>([]);
  
  const [viewDate, setViewDate] = useState(new Date());
  const today = useMemo(() => new Date().toDateString(), [viewDate]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [fullEventId, setFullEventId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [eventError, setEventError] = useState('');
  const [eventFieldErrors, setEventFieldErrors] = useState<{
    title?: string;
    scheduledAt?: string;
    meetingLink?: string;
  }>({});
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadRef = useRef<{ (): Promise<void> } | null>(null);

  const load = async () => {
    try {
      const [e, p] = await Promise.all([
        eventApi.list(),
        geoApi.communityMap(),
      ]);
      setEvents(e);
      setPoints(p);
    } catch (loadError) {
      console.error(loadError);
    }
  };

  loadRef.current = load;

  useEffect(() => {
    void load();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loadRef.current?.();
      }
    };
    const handleFocus = () => {
      void loadRef.current?.();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleCreateClick = (date?: Date) => {
    setDraft({
      title: '',
      description: '',
      event_color: 'violet',
      event_group: '',
      event_type: '',
      meeting_link: '',
      place_label: '',
      region: '',
      country: '',
      city: '',
      scheduled_at: buildDefaultScheduledAt(date),
      invited_user_ids: [],
    });
    setIsCreating(true);
    setEventError('');
    setEventFieldErrors({});
  };

  const toEventPayload = (draft: EventDraft): CreateEventPayload => ({
    title: draft.title,
    description: draft.description,
    event_color: draft.event_color,
    event_group: draft.event_group,
    event_type: draft.event_type,
    meeting_link: draft.meeting_link,
    place_label: draft.place_label,
    region: draft.region,
    country: draft.country,
    city: draft.city,
    latitude: draft.latitude ?? 0,
    longitude: draft.longitude ?? 0,
    scheduled_at: draft.scheduled_at,
    invited_user_ids: draft.invited_user_ids,
  });

  const handleSave = async () => {
    if (!draft) return;

    const nextFieldErrors: {
      title?: string;
      scheduledAt?: string;
      meetingLink?: string;
    } = {};

    if (!draft.title.trim()) {
      nextFieldErrors.title = 'Введите название';
    }
    if (!draft.scheduled_at) {
      nextFieldErrors.scheduledAt = 'Укажите дату и время';
    }
    if (
      draft.meeting_link.trim() &&
      !/^https?:\/\//i.test(draft.meeting_link.trim())
    ) {
      nextFieldErrors.meetingLink = 'Ссылка должна начинаться с http:// или https://';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setEventFieldErrors(nextFieldErrors);
      setEventError('');
      return;
    }

    setIsSaving(true);
    setEventFieldErrors({});
    try {
      if (editingEventId) {
        const updated = await eventApi.update(editingEventId, toEventPayload(draft));
        setEvents((curr: CommunityEvent[]) => curr.map((e: CommunityEvent) => e.id === updated.id ? updated : e));
      } else {
        const created = await eventApi.create(toEventPayload(draft));
        setEvents((curr: CommunityEvent[]) => [created, ...curr]);
      }
      setIsCreating(false);
      setEditingEventId(null);
      setDraft(null);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      if (axiosErr.response?.data?.message?.includes('scheduled_at must be in the future')) {
        setEventError('Дата события должна быть в будущем');
      } else {
        setEventError('Ошибка сохранения');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const eventGroups = useMemo(
    () => Array.from(new Set(events.map((event) => event.event_group.trim()).filter(Boolean))).sort(),
    [events],
  );
  const eventTypes = useMemo(
    () => Array.from(new Set(events.map((event) => event.event_type.trim()).filter(Boolean))).sort(),
    [events],
  );
  const filteredEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          (groupFilter === 'all' || event.event_group === groupFilter) &&
          (typeFilter === 'all' || event.event_type === typeFilter),
      ),
    [events, groupFilter, typeFilter],
  );

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await eventApi.delete(confirmDeleteId);
      setEvents((curr: CommunityEvent[]) => curr.filter((e: CommunityEvent) => e.id !== confirmDeleteId));
      setFullEventId(null);
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // Calendar Logic
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  
  let startOffset = firstDayOfMonth.getDay() - 1;
  if (startOffset === -1) startOffset = 6;
  
  const days: Date[] = [];
  const startDay = new Date(firstDayOfMonth);
  startDay.setDate(startDay.getDate() - startOffset);
  
  for (let i = 0; i < 42; i++) {
    days.push(new Date(startDay));
    startDay.setDate(startDay.getDate() + 1);
  }

    const changeMonth = (offset: number) => {
      setViewDate(new Date(year, month + offset, 1));
  };

  return (
    <div className="fade-in" style={{ height: isMobile ? 'auto' : 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>{MONTHS[month]} {year}</h1>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
            <button onClick={() => changeMonth(-1)} aria-label="Предыдущий месяц" className="hover-opacity" style={{ background: 'none', border: 'none', color: 'white', padding: '6px', cursor: 'pointer' }}><ChevronLeft size={20}/></button>
            <button onClick={() => setViewDate(new Date())} aria-label="Перейти к сегодня" className="hover-opacity" style={{ background: 'none', border: 'none', color: 'white', fontSize: '13px', fontWeight: '500', padding: '0 12px', cursor: 'pointer' }}>Сегодня</button>
            <button onClick={() => changeMonth(1)} aria-label="Следующий месяц" className="hover-opacity" style={{ background: 'none', border: 'none', color: 'white', padding: '6px', cursor: 'pointer' }}><ChevronRight size={20}/></button>
          </div>
        </div>
        <button className="btn" onClick={() => handleCreateClick()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '12px', width: isMobile ? '100%' : 'auto' }}>
          <Plus size={18} /> Создать
        </button>
      </div>

      <div className="card" style={{ marginBottom: '20px', padding: '18px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr 1fr', gap: '12px', alignItems: 'end' }}>
        <div>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '8px' }}>Группа</div>
          <select className="input" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
            <option value="all">Все группы</option>
            {eventGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '8px' }}>Тип</div>
          <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">Все типы</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={() => { setGroupFilter('all'); setTypeFilter('all'); }} style={{ minHeight: '44px' }}>
          Сбросить фильтры
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {WEEKDAYS.map(d => (
            <div key={d} style={{ padding: isMobile ? '10px 4px' : '12px', textAlign: 'center', fontSize: isMobile ? '10px' : '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{d}</div>
          ))}
        </div>
        
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, 1fr)' }}>
          {days.map((date, idx) => {
            const isCurrentMonth = date.getMonth() === month;
            const isToday = date.toDateString() === today;
            const dateStr = getLocalDateKey(date);
            const dayEvents = filteredEvents.filter(
              (e) => getLocalDateKey(e.scheduled_at) === dateStr,
            );

            return (
              <div 
                key={idx} 
                onClick={() => !dayEvents.length && handleCreateClick(date)}
                style={{ 
                  borderRight: '1px solid rgba(255,255,255,0.03)', 
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  padding: isMobile ? '4px' : '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: isMobile ? '2px' : '4px',
                  opacity: isCurrentMonth ? 1 : 0.3,
                  background: isToday ? 'rgba(79, 70, 229, 0.03)' : 'transparent',
                  cursor: 'pointer'
                }}
              >
                <div style={{ 
                  fontSize: isMobile ? '10px' : '12px', 
                  fontWeight: isToday ? '700' : '400', 
                  width: isMobile ? '20px' : '24px', 
                  height: isMobile ? '20px' : '24px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: isToday ? 'var(--accent-color)' : 'transparent',
                  color: isToday ? 'white' : 'var(--text-secondary)',
                  marginBottom: '4px'
                }}>
                  {date.getDate()}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                  {dayEvents.map((e) => {
                    const styleAccent = getEventColorSpec(e.event_color);
                    return (
                      <div 
                        key={e.id}
                        onClick={(ev) => { ev.stopPropagation(); setFullEventId(e.id); }}
                        style={{ 
                          fontSize: isMobile ? '9px' : '11px', 
                          padding: isMobile ? '3px 4px' : '4px 8px', 
                          borderRadius: '4px', 
                          background: e.is_joined ? styleAccent.solid : styleAccent.soft,
                          color: 'white',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          borderLeft: `3px solid ${styleAccent.solid}`
                        }}
                      >
                        {e.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {(isCreating || editingEventId) && draft && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px' }} className="hide-scrollbar">
            <EventForm
              title={editingEventId ? "Ред. событие" : "Новое событие"}
              draft={draft}
              setDraft={setDraft}
              onClose={() => { setIsCreating(false); setEditingEventId(null); }}
              onSubmit={handleSave}
              isSaving={isSaving}
              error={eventError}
              fieldErrors={eventFieldErrors}
              users={points}
              inviteSearchQuery={inviteSearchQuery}
              setInviteSearchQuery={setInviteSearchQuery}
            />
          </div>
        </div>
      )}

      <FullEventOverlay 
        eventId={fullEventId} 
        events={filteredEvents} 
        onClose={() => setFullEventId(null)} 
        isAdmin={currentUser?.isAdmin}
        onDelete={handleDelete}
      />

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Удалить событие?"
        message="Вы уверены, что хотите удалить это событие? Все приглашенные участники получат уведомление об отмене."
        confirmText="Удалить навсегда"
        cancelText="Отмена"
        isDangerous={true}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};
