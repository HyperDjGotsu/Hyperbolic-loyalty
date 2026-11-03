import { ApiError } from '@/lib/api';

// Pulls the event id out of whatever the kiosk QR holds: the live kiosk encodes
// https://playerpass.gg/checkin?event_id=<id>; older codes were /event/<id> or just the id.
export function eventIdFromQr(data: string): string | null {
  const text = data.trim();
  const query = text.match(/[?&]event_id=([A-Za-z0-9-]{1,64})/);
  if (query) return query[1];
  const path = text.match(/\/event\/([A-Za-z0-9-]{1,64})(?:[/?#]|$)/);
  if (path) return path[1];
  return /^[A-Za-z0-9-]{1,64}$/.test(text) ? text : null;
}

export type CheckinOutcome =
  | { kind: 'success'; xp: number; prizePoints: number }
  | { kind: 'already' }
  | { kind: 'renewal' }
  | { kind: 'error'; message: string };

type CheckinBody = {
  success?: boolean;
  lifetimeXpAwarded?: number;
  xp_awarded?: number;
  prizePointsAwarded?: number;
  alreadyCheckedIn?: boolean;
  renewalOpportunity?: boolean;
};

// Runs a check-in and sorts the server's answers into the same four states the web check-in page shows.
export async function runCheckin(
  post: <T>(path: string, body: unknown) => Promise<T>,
  eventId: string,
  body: Record<string, unknown> = {}
): Promise<CheckinOutcome> {
  try {
    const res = await post<CheckinBody>(`/api/events/${eventId}/checkin`, body);
    if (res.renewalOpportunity) return { kind: 'renewal' };
    if (res.success) {
      return { kind: 'success', xp: res.lifetimeXpAwarded ?? res.xp_awarded ?? 0, prizePoints: res.prizePointsAwarded ?? 0 };
    }
    return { kind: 'error', message: 'Check-in failed. Please try again.' };
  } catch (e: unknown) {
    if (e instanceof ApiError) {
      if (e.status === 400 && /alreadyCheckedIn/.test(e.message)) return { kind: 'already' };
      return { kind: 'error', message: e.serverMessage ?? 'Check-in failed. Please try again.' };
    }
    return { kind: 'error', message: 'Network error. Check your connection and try again.' };
  }
}

export type ActiveEventInfo = {
  id: string;
  name: string;
  attendanceXp: number;
  attendanceCount: number;
  game: { name: string; icon: string; color: string } | null;
};

// The live event a player is about to check in to (same data the web check-in page previews).
// Returns null when the event is not live, ended, cancelled or unknown.
export async function fetchActiveEvent(
  get: <T>(path: string) => Promise<T>,
  eventId: string
): Promise<ActiveEventInfo | null> {
  const data = await get<{ event: ActiveEventInfo | null }>(`/api/events/active?event_id=${encodeURIComponent(eventId)}`);
  return data.event && data.event.id === eventId ? data.event : null;
}

// Event ids are plain ids; reject anything else before it reaches a path or a query string.
export function isSafeEventId(id: unknown): id is string {
  return typeof id === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(id);
}
