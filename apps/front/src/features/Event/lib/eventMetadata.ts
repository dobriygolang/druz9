export type EventColorKey = 'violet' | 'emerald' | 'amber' | 'rose' | 'sky';

export type EventMeta = {
  color: EventColorKey;
  group: string;
  type: string;
};

const DEFAULT_META: EventMeta = {
  color: 'violet',
  group: '',
  type: '',
};

const MARKER_PATTERN = /^<!--druz9:event-meta:(.+?)-->\n?/s;

export const EVENT_COLOR_OPTIONS: Array<{ value: EventColorKey; label: string; solid: string; soft: string }> = [
  { value: 'violet', label: 'Violet', solid: '#5D57FF', soft: 'rgba(93, 87, 255, 0.18)' },
  { value: 'emerald', label: 'Emerald', solid: '#18B77E', soft: 'rgba(24, 183, 126, 0.18)' },
  { value: 'amber', label: 'Amber', solid: '#D89B1D', soft: 'rgba(216, 155, 29, 0.18)' },
  { value: 'rose', label: 'Rose', solid: '#E35D8F', soft: 'rgba(227, 93, 143, 0.18)' },
  { value: 'sky', label: 'Sky', solid: '#2FA7D8', soft: 'rgba(47, 167, 216, 0.18)' },
];

export function getEventColorSpec(color?: string) {
  return EVENT_COLOR_OPTIONS.find((item) => item.value === color) ?? EVENT_COLOR_OPTIONS[0];
}

export function parseEventDescription(rawDescription: string | undefined | null): { description: string; meta: EventMeta } {
  const description = rawDescription ?? '';
  const match = description.match(MARKER_PATTERN);
  if (!match) {
    return { description, meta: DEFAULT_META };
  }

  try {
    const parsed = JSON.parse(match[1]) as Partial<EventMeta>;
    return {
      description: description.replace(MARKER_PATTERN, ''),
      meta: {
        color: EVENT_COLOR_OPTIONS.some((item) => item.value === parsed.color) ? (parsed.color as EventColorKey) : DEFAULT_META.color,
        group: typeof parsed.group === 'string' ? parsed.group.trim() : '',
        type: typeof parsed.type === 'string' ? parsed.type.trim() : '',
      },
    };
  } catch {
    return { description: description.replace(MARKER_PATTERN, ''), meta: DEFAULT_META };
  }
}

export function encodeEventDescription(description: string, meta: Partial<EventMeta>): string {
  const cleanDescription = description.trim();
  const payload: EventMeta = {
    color: EVENT_COLOR_OPTIONS.some((item) => item.value === meta.color) ? (meta.color as EventColorKey) : DEFAULT_META.color,
    group: (meta.group ?? '').trim(),
    type: (meta.type ?? '').trim(),
  };
  const marker = `<!--druz9:event-meta:${JSON.stringify(payload)}-->`;
  return cleanDescription ? `${marker}\n${cleanDescription}` : marker;
}
