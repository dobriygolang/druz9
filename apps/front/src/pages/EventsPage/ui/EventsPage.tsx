import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  Sparkles,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react';

import { CommunityEvent, CommunityMapPoint, CreateEventPayload } from '@/entities/User/model/types';
import { eventApi } from '@/features/Event/api/eventApi';
import { geoApi } from '@/features/Geo/api/geoApi';
import { FullEventOverlay } from '@/shared/ui/FullEventOverlay/FullEventOverlay';
import { EventForm } from '@/shared/ui/EventForm/EventForm';
import { ConfirmModal } from '@/shared/ui/ConfirmModal/ConfirmModal';
import { FancySelect } from '@/shared/ui/FancySelect';
import { EventDraft } from '@/pages/MapPage/components/types';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { AxiosError } from '@/shared/api/base';
import { getEventColorSpec } from '@/features/Event/lib/eventMetadata';
import { MobileDrawer } from '@/shared/ui/MobileDrawer/MobileDrawer';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

function pluralizeRu(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

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
  const canCreateEvents = Boolean(currentUser?.isAdmin);
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
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

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
    if (!canCreateEvents) {
      return;
    }
    setDraft({
      title: '',
      description: '',
      event_color: 'violet',
      event_group: '',
      event_type: '',
      repeat: 'none',
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
    repeat: draft.repeat ?? 'none',
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

  const handleDelete = async (id: string, deleteScope?: 'single' | 'future' | 'all') => {
    if (deleteScope) {
      try {
        await eventApi.delete(id, deleteScope);
        await load();
        setFullEventId(null);
      } catch (err) {
        console.error('Delete failed', err);
      }
      return;
    }
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
    <div className="events-page fade-in">
      <section className="page-header code-rooms-hero events-hero">
        <div className="code-rooms-hero__copy">
          {!isMobile && <span className="code-rooms-kicker">Community Calendar</span>}
          <h1>{isMobile ? 'Календарь' : 'Ивенты'}</h1>
          <p className="code-rooms-subtitle">
            {isMobile 
              ? 'Встречи, алгоритмы и созвоны сообщества.' 
              : 'Общий календарь сообщества: встречи, алгоритмы, клубы и созвоны. Фильтруй по группе и типу, быстро листай месяцы.'}
          </p>
          <div className="events-hero__meta">
            <span className="badge"><Calendar size={12} /> {events.length}</span>
            {!isMobile && (
              <>
                <span className="badge"><Sparkles size={12} /> {eventGroups.length || 1} {pluralizeRu(eventGroups.length || 1, 'группа', 'группы', 'групп')}</span>
                <span className="badge"><MapPin size={12} /> {eventTypes.length || 1} {pluralizeRu(eventTypes.length || 1, 'формат', 'формата', 'форматов')}</span>
              </>
            )}
          </div>
        </div>

        <div className="events-hero__tools">
          <div className="events-month-switcher">
            <button type="button" className="events-month-switcher__icon" onClick={() => changeMonth(-1)} aria-label="Предыдущий месяц">
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="events-month-switcher__label" onClick={() => setViewDate(new Date())} aria-label="Перейти к сегодня">
              {MONTHS[month]} {year}
            </button>
            <button type="button" className="events-month-switcher__icon" onClick={() => changeMonth(1)} aria-label="Следующий месяц">
              <ChevronRight size={18} />
            </button>
          </div>

          {!isMobile && (
            <div className="events-filter-grid events-filter-grid--hero">
              <div className="events-filter-field">
                <label>Группа</label>
                <FancySelect
                  value={groupFilter}
                  options={[
                    { value: 'all', label: 'Все группы' },
                    ...eventGroups.map((group) => ({ value: group, label: group })),
                  ]}
                  onChange={setGroupFilter}
                />
              </div>
              <div className="events-filter-field">
                <label>Тип</label>
                <FancySelect
                  value={typeFilter}
                  options={[
                    { value: 'all', label: 'Все типы' },
                    ...eventTypes.map((type) => ({ value: type, label: type })),
                  ]}
                  onChange={setTypeFilter}
                />
              </div>
              <button className="btn btn-secondary events-filter-reset" onClick={() => { setGroupFilter('all'); setTypeFilter('all'); }}>
                Сбросить
              </button>
            </div>
          )}

          {canCreateEvents && (
            <button className="btn btn-primary events-hero__create" onClick={() => handleCreateClick()}>
              <Plus size={18} />
              <span>{isMobile ? 'Создать' : 'Создать событие'}</span>
            </button>
          )}

          {isMobile && (
            <button 
              className="btn btn-secondary events-hero__filter-btn" 
              onClick={() => setIsFilterDrawerOpen(true)}
              style={{ padding: '0 12px' }}
            >
              <SlidersHorizontal size={18} />
              {(groupFilter !== 'all' || typeFilter !== 'all') && <span className="filter-dot" />}
            </button>
          )}
        </div>
      </section>

      <MobileDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title="Фильтры календаря"
        footer={
          <button 
            className="btn btn-primary w-full" 
            onClick={() => setIsFilterDrawerOpen(false)}
          >
            Применить
          </button>
        }
      >
        <div className="events-mobile-filters">
          <div className="events-filter-field">
            <label>Группа</label>
            <FancySelect
              value={groupFilter}
              options={[
                { value: 'all', label: 'Все группы' },
                ...eventGroups.map((group) => ({ value: group, label: group })),
              ]}
              onChange={setGroupFilter}
            />
          </div>
          <div className="events-filter-field" style={{ marginTop: '16px' }}>
            <label>Тип</label>
            <FancySelect
              value={typeFilter}
              options={[
                { value: 'all', label: 'Все типы' },
                ...eventTypes.map((type) => ({ value: type, label: type })),
              ]}
              onChange={setTypeFilter}
            />
          </div>
          <button 
            className="btn btn-ghost w-full" 
            style={{ marginTop: '20px' }}
            onClick={() => { setGroupFilter('all'); setTypeFilter('all'); }}
          >
            Сбросить фильтры
          </button>
        </div>
      </MobileDrawer>

      <section className="events-calendar-shell">
        <div className="events-calendar-grid-head">
          {WEEKDAYS.map(d => (
            <div key={d} className="events-calendar-weekday">{d}</div>
          ))}
        </div>
        
        <div className="events-calendar-grid">
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
                onClick={() => !dayEvents.length && canCreateEvents && handleCreateClick(date)}
                className={`events-calendar-day ${isCurrentMonth ? '' : 'is-outside'} ${isToday ? 'is-today' : ''}`}
              >
                <div className={`events-calendar-day__date ${isToday ? 'is-today' : ''}`}>
                  {date.getDate()}
                </div>
                
                <div className="events-calendar-day__events">
                  {dayEvents.map((e) => {
                    const styleAccent = getEventColorSpec(e.event_color);
                    return (
                      <div 
                        key={e.id}
                        onClick={(ev) => { ev.stopPropagation(); setFullEventId(e.id); }}
                        className="events-calendar-pill"
                        style={{
                          background: e.is_joined ? styleAccent.solid : styleAccent.soft,
                          borderLeft: `3px solid ${styleAccent.solid}`,
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
      </section>

      {(isCreating || editingEventId) && draft && (
        <div className="events-form-overlay" onClick={() => { setIsCreating(false); setEditingEventId(null); }}>
          <div className="events-form-overlay__panel hide-scrollbar" onClick={(event) => event.stopPropagation()}>
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
