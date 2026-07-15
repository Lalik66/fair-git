import api from './api';

export type EventCategory =
  | 'performance'
  | 'workshop'
  | 'food'
  | 'show'
  | 'music'
  | 'other';

export type EventLocationType = 'house' | 'facility' | 'zone';

export const EVENT_CATEGORIES: EventCategory[] = [
  'performance',
  'workshop',
  'food',
  'show',
  'music',
  'other',
];

export const EVENT_CATEGORY_EMOJI: Record<EventCategory, string> = {
  performance: '🎭',
  workshop: '🎨',
  food: '🍕',
  show: '🎪',
  music: '🎵',
  other: '✨',
};

export interface FairEvent {
  id: string;
  fairId: string;
  nameAz: string;
  nameEn: string;
  descriptionAz: string | null;
  descriptionEn: string | null;
  category: EventCategory;
  emoji: string | null;
  startTime: string;
  endTime: string;
  locationType: EventLocationType;
  locationId: string;
  isCancelled: boolean;
  // Hydrated on public list/get endpoints, absent on admin list.
  locationLabel?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
}

export interface ListEventsParams {
  fairId: string;
  nowOnly?: boolean;
  locationId?: string;
  locationType?: EventLocationType;
}

export async function listEvents(params: ListEventsParams): Promise<FairEvent[]> {
  if (!params.fairId) return [];
  const res = await api.get<{ events: FairEvent[] }>('/events', {
    params: {
      fairId: params.fairId,
      nowOnly: params.nowOnly ? 'true' : undefined,
      locationId: params.locationId,
      locationType: params.locationType,
    },
  });
  return res.data.events;
}

export async function getEvent(id: string): Promise<FairEvent> {
  const res = await api.get<{ event: FairEvent }>(`/events/${id}`);
  return res.data.event;
}

export async function listEventsAdmin(fairId: string): Promise<FairEvent[]> {
  const res = await api.get<{ events: FairEvent[] }>('/events/admin/list', {
    params: { fairId },
  });
  return res.data.events;
}

export interface CreateEventInput {
  fairId: string;
  nameAz: string;
  nameEn: string;
  descriptionAz?: string | null;
  descriptionEn?: string | null;
  category: EventCategory;
  emoji?: string | null;
  startTime: string;
  endTime: string;
  locationType: EventLocationType;
  locationId: string;
  isCancelled?: boolean;
}

export async function createEvent(input: CreateEventInput): Promise<FairEvent> {
  const res = await api.post<{ event: FairEvent }>('/events', input);
  return res.data.event;
}

export type UpdateEventInput = Partial<Omit<CreateEventInput, 'fairId'>>;

export async function updateEvent(id: string, input: UpdateEventInput): Promise<FairEvent> {
  const res = await api.patch<{ event: FairEvent }>(`/events/${id}`, input);
  return res.data.event;
}

export async function deleteEvent(id: string): Promise<void> {
  await api.delete(`/events/${id}`);
}
