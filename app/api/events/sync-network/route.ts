import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireNetworkAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// Re-use the iCal parser from the store sync — same format, different source
// (duplicated here to keep routes self-contained)

function parseICalDate(dateStr: string, tzid?: string): Date {
  dateStr = dateStr.replace('Z', '');
  if (dateStr.length === 8) {
    return new Date(
      parseInt(dateStr.slice(0, 4)),
      parseInt(dateStr.slice(4, 6)) - 1,
      parseInt(dateStr.slice(6, 8))
    );
  }
  const year = parseInt(dateStr.slice(0, 4));
  const month = parseInt(dateStr.slice(4, 6)) - 1;
  const day = parseInt(dateStr.slice(6, 8));
  const hour = parseInt(dateStr.slice(9, 11));
  const minute = parseInt(dateStr.slice(11, 13));
  const second = parseInt(dateStr.slice(13, 15)) || 0;
  if (tzid?.includes('Los_Angeles') || tzid?.includes('Pacific')) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const probe = new Date(`${year}-${mm}-${dd}T20:00:00Z`);
    const probeHour = parseInt(probe.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false }));
    const offset = probeHour === 13 ? '-07:00' : '-08:00';
    return new Date(`${year}-${mm}-${dd}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:${String(second).padStart(2,'0')}${offset}`);
  }
  return new Date(year, month, day, hour, minute, second);
}

const GAME_PATTERNS: { pattern: RegExp; id: string }[] = [
  { pattern: /one\s*piece/i, id: 'one_piece' },
  { pattern: /gundam/i, id: 'gundam' },
  { pattern: /pokemon|pokémon/i, id: 'pokemon' },
  { pattern: /magic|mtg|fnm/i, id: 'mtg' },
  { pattern: /star\s*wars\s*unlimited|swu/i, id: 'star_wars_unlimited' },
  { pattern: /yu-?gi-?oh|yugioh/i, id: 'yugioh' },
  { pattern: /flesh.*blood|fab/i, id: 'fab' },
  { pattern: /riftbound/i, id: 'riftbound' },
];

function detectGameId(title: string): string | null {
  for (const g of GAME_PATTERNS) {
    if (g.pattern.test(title)) return g.id;
  }
  return null;
}

interface ParsedEvent {
  gcal_uid: string;
  name: string;
  game_id: string | null;
  description: string | null;
  scheduled_at: string;
  ends_at: string | null;
  status: string;
}

function parseICal(icalData: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const lines = icalData.split(/\r?\n/);
  let inEvent = false;
  let currentEvent: Record<string, string> = {};
  let currentKey = '';

  for (const line of lines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (currentKey) currentEvent[currentKey] += line.slice(1);
      continue;
    }
    if (line === 'BEGIN:VEVENT') { inEvent = true; currentEvent = {}; currentKey = ''; continue; }
    if (line === 'END:VEVENT') {
      inEvent = false;
      const summary = currentEvent['SUMMARY'] || '';
      const uid = currentEvent['UID'] || `net_${Date.now()}`;
      const dtstart = currentEvent['DTSTART'];
      const dtend = currentEvent['DTEND'];
      if (!dtstart || !summary) continue;

      const dtstartRaw = currentEvent['DTSTART_RAW'] || '';
      const tzidMatch = dtstartRaw.match(/TZID=([^:;]+)/);
      const startDate = parseICalDate(dtstart, tzidMatch?.[1]);
      const endDate = dtend ? parseICalDate(dtend, tzidMatch?.[1]) : null;

      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - 24);
      if (startDate < cutoff) continue;

      events.push({
        gcal_uid: `net_${uid}`,
        name: summary,
        game_id: detectGameId(summary),
        description: (currentEvent['DESCRIPTION'] || '').replace(/\\n/g, '\n').replace(/\\,/g, ',').trim() || null,
        scheduled_at: startDate.toISOString(),
        ends_at: endDate?.toISOString() || null,
        status: 'scheduled',
      });
      continue;
    }
    if (inEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      const fullKey = line.slice(0, colonIndex);
      const value = line.slice(colonIndex + 1);
      const key = fullKey.split(';')[0];
      currentEvent[key] = value;
      currentKey = key;
      if (key === 'DTSTART' || key === 'DTEND') currentEvent[`${key}_RAW`] = fullKey;
    }
  }
  return events;
}

export async function POST(request: Request) {
  try {
    const isCron = request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
    if (!isCron) {
      const staffCtx = await requireNetworkAdmin();
      if (!staffCtx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: config } = await supabaseAdmin
      .from('store_config')
      .select('network_calendar_url')
      .eq('id', 1)
      .single();

    const icalUrl = (config as any)?.network_calendar_url || '';
    if (!icalUrl) {
      return NextResponse.json({ error: 'No network calendar URL configured. Set it in HQ → Settings → Network Calendar.' }, { status: 400 });
    }

    const response = await fetch(icalUrl, { cache: 'no-store', headers: { 'User-Agent': 'HyperbolicLoyalty/1.0' } });
    if (!response.ok) return NextResponse.json({ error: 'Failed to fetch network calendar' }, { status: 500 });

    const parsedEvents = parseICal(await response.text());
    if (!parsedEvents.length) return NextResponse.json({ message: 'No upcoming network events found', synced: 0 });

    let synced = 0;
    for (const event of parsedEvents) {
      const { data: existing } = await (supabaseAdmin as any)
        .from('events').select('id').eq('gcal_uid', event.gcal_uid).single();

      if (existing) {
        await (supabaseAdmin as any).from('events').update({
          name: event.name, game_id: event.game_id, description: event.description,
          scheduled_at: event.scheduled_at, ends_at: event.ends_at, store_id: null,
        }).eq('id', existing.id);
      } else {
        await (supabaseAdmin as any).from('events').insert({
          gcal_uid: event.gcal_uid, name: event.name, game_id: event.game_id,
          description: event.description, scheduled_at: event.scheduled_at,
          ends_at: event.ends_at, status: event.status,
          store_id: null, entry_fee: null, max_players: null,
          has_stream: false, attendance_xp: 50, win_xp: 15,
          current_players: 0, prizing: null,
        });
      }
      synced++;
    }

    return NextResponse.json({ message: `Synced ${synced} network events`, synced });
  } catch (err) {
    console.error('Network calendar sync error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
