import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireNetworkAdmin } from '@/lib/auth-helpers';
import { fetchICalSafe } from '@/lib/ical-fetch';
import { notifyStorePlayers } from '@/lib/notifications';


export const dynamic = 'force-dynamic';

// Game detection from event titles
const GAME_PATTERNS: { pattern: RegExp; id: string }[] = [
  { pattern: /one\s*piece/i, id: 'one_piece' },
  { pattern: /gundam/i, id: 'gundam' },
  { pattern: /pokemon|pokémon/i, id: 'pokemon' },
  { pattern: /magic|mtg|friday\s*night\s*magic|fnm/i, id: 'mtg' },
  { pattern: /star\s*wars\s*unlimited|swu/i, id: 'star_wars_unlimited' },
  { pattern: /vanguard|cfv/i, id: 'vanguard' },
  { pattern: /dragon\s*ball|dbz|dbs|dbscg/i, id: 'dbs' },
  { pattern: /lorcana/i, id: 'lorcana' },
  { pattern: /yu-?gi-?oh|yugioh/i, id: 'yugioh' },
  { pattern: /digimon/i, id: 'digimon' },
  { pattern: /weiss|schwarz/i, id: 'weiss' },
  { pattern: /union\s*arena/i, id: 'union_arena' },
  { pattern: /blood\s*bowl/i, id: 'blood_bowl' },
  { pattern: /bolt\s*action/i, id: 'bolt_action' },
  { pattern: /warhammer|40k|kill\s*team/i, id: 'warhammer' },
  { pattern: /star\s*wars\s*legion|sw\s*legion|legion/i, id: 'sw_legion' },
  { pattern: /flesh.*blood|fab/i, id: 'fab' },
  { pattern: /hololive/i, id: 'hololive' },
  { pattern: /riftbound/i, id: 'riftbound' },
  { pattern: /uvs|universus/i, id: 'uvs' },
  { pattern: /final\s*fantasy|fftcg/i, id: 'fftcg' },
  { pattern: /battletech/i, id: 'battletech' },
  { pattern: /azuki/i, id: 'azuki' },
  { pattern: /dice\s*throne/i, id: 'dice_throne' },
  { pattern: /dungeons|d&d|adventurers?\s*league/i, id: 'dnd' },
  { pattern: /board\s*game|hobby\s*night/i, id: 'board_games' },
];

// Event titles to skip (not game events)
const SKIP_PATTERNS: RegExp[] = [
  /store\s*open\s*hours?/i,
  /closed/i,
  /holiday/i,
];

// Entry fee / settings overrides based on event title
const EVENT_OVERRIDES: { pattern: RegExp; entryFee?: number; maxPlayers?: number; attendanceXp?: number; winXp?: number; hasStream?: boolean }[] = [
  { pattern: /berry\s*bounty/i, entryFee: 5, maxPlayers: 32, attendanceXp: 25, winXp: 10, hasStream: true },
  { pattern: /one\s*piece.*weekly/i, entryFee: 5, hasStream: true },
  { pattern: /gundam.*night/i, entryFee: 0, maxPlayers: 12 },
  { pattern: /pokemon.*league/i, entryFee: 0, attendanceXp: 15 },
  { pattern: /draft/i, entryFee: 15, maxPlayers: 8 },
  { pattern: /pre-?release/i, entryFee: 30, maxPlayers: 32 },
  { pattern: /tournament/i, entryFee: 5 },
  { pattern: /casual|free\s*play/i, entryFee: 0 },
  { pattern: /league/i, entryFee: 0 },
];

interface ParsedEvent {
  gcal_uid: string;
  name: string;
  game_id: string | null;
  description: string | null;
  scheduled_at: string;
  ends_at: string | null;
  entry_fee: number | null;
  max_players: number | null;
  has_stream: boolean;
  attendance_xp: number;
  win_xp: number;
  status: string;
  prizing: string[] | null;
}

// Parse iCal date format with timezone support
function parseICalDate(dateStr: string, tzid?: string): Date {
  // Remove Z suffix if present
  dateStr = dateStr.replace('Z', '');
  
  if (dateStr.length === 8) {
    // All-day event: YYYYMMDD
    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6)) - 1;
    const day = parseInt(dateStr.slice(6, 8));
    return new Date(year, month, day);
  } else {
    // Datetime: YYYYMMDDTHHMMSS
    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6)) - 1;
    const day = parseInt(dateStr.slice(6, 8));
    const hour = parseInt(dateStr.slice(9, 11));
    const minute = parseInt(dateStr.slice(11, 13));
    const second = parseInt(dateStr.slice(13, 15)) || 0;
    
    // If timezone is America/Los_Angeles (or similar Pacific), create date string
    // and let the server interpret it using the correct DST-aware offset.
    if (tzid?.includes('Los_Angeles') || tzid?.includes('Pacific')) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const hh = String(hour).padStart(2, '0');
      const min = String(minute).padStart(2, '0');
      const ss = String(second).padStart(2, '0');
      const isoLocal = `${year}-${mm}-${dd}T${hh}:${min}:${ss}`;
      // Determine whether PDT (-07:00) or PST (-08:00) applies on this exact date.
      // Probe 20:00 UTC: in PDT (UTC-7) = 13:00, in PST (UTC-8) = 12:00.
      // Use formatToParts to extract the hour reliably — toLocaleString returns a
      // full datetime string that parseInt misreads as the month, not the hour.
      const probe = new Date(`${year}-${mm}-${dd}T20:00:00Z`);
      const probeHour = parseInt(
        new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', hour12: false })
          .formatToParts(probe)
          .find(p => p.type === 'hour')!.value
      );
      const offset = probeHour === 13 ? '-07:00' : '-08:00'; // 13 = PDT, 12 = PST
      return new Date(`${isoLocal}${offset}`);
    }
    
    // Default: assume the time is already in the server's timezone
    return new Date(year, month, day, hour, minute, second);
  }
}

// Detect game from event title
function detectGameId(title: string): string | null {
  for (const game of GAME_PATTERNS) {
    if (game.pattern.test(title)) {
      return game.id;
    }
  }
  return null;
}

// Parse explicit price from title or description
// Matches: "$5", "Price - $10", "Entry: $15", "Price: $20", "$5.00", "Fee - $7", "entry is $15"
function parseExplicitPrice(text: string): number | null {
  // Look for patterns like: $X, $X.XX, Price - $X, Entry: $X, Fee - $X, entry is $X
  const pricePatterns = [
    /(?:price|entry|fee|cost)\s*(?:is|:|-)\s*\$(\d+(?:\.\d{2})?)/i,  // "Price is $5" or "Entry: $10"
    /\$(\d+(?:\.\d{2})?)\s*(?:entry|fee)?/i,                          // "$5" or "$5 entry"
  ];
  
  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  
  // Also check for "Free" explicitly
  if (/\bfree\s*entry\b/i.test(text) || /\bentry\s*(?:is\s*)?free\b/i.test(text)) {
    return 0;
  }
  
  return null;
}

// Parse max players from text
// Matches: "Players: 32", "16 spots", "max 32", "spots: 24", "limit 16"
function parseMaxPlayers(text: string): number | null {
  const patterns = [
    // Priority 1: Explicit label before number (most reliable)
    /(?:players?|spots?|seats?)(?:\s*:)?\s*(\d+)/i,                    // "Players: 32" or "spots: 24"
    /(?:max|limit|capacity)(?:\s*:)?\s*(\d+)/i,                        // "max 32" or "limit: 16"
    // Priority 2: Number before label (but NOT preceded by $)
    /(?<!\$)(\d+)\s+(?:spots?|seats?|players?)\s*(?:open|available|max)?/i,  // "32 players" but not "$32 players"
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseInt(match[1]);
      if (num > 0 && num <= 256) { // Sanity check
        return num;
      }
    }
  }
  
  return null;
}

// Parse prizing from description
// Matches: "Prizing: Pack per win", "Prizing: 1-3-5, Promo", "Prizes: pack per win"
function parsePrizing(text: string): string[] | null {
  // Look for "Prizing:" or "Prizes:" line
  const prizingMatch = text.match(/(?:prizing|prizes?)\s*(?::|is|-)\s*(.+?)(?:\n|$)/i);
  
  if (prizingMatch) {
    const prizingText = prizingMatch[1].trim();
    
    // Split by comma or "and"
    const prizes = prizingText
      .split(/,|\band\b/i)
      .map(p => p.trim().toLowerCase())
      .filter(p => p.length > 0)
      .map(p => {
        // Normalize prize names
        if (/pack\s*per\s*win|ppw/i.test(p)) return 'pack-per-win';
        if (/1-3-5|1\s*3\s*5/i.test(p)) return '1-3-5';
        if (/promo/i.test(p)) return 'promo';
        // Return as-is if not a known type (allows custom prizes)
        return p;
      });
    
    return prizes.length > 0 ? prizes : null;
  }
  
  return null;
}

// Expand recurring events into individual instances
// Supports WEEKLY recurrence for the next 4 weeks
function expandRecurringEvent(
  baseEvent: ParsedEvent,
  rrule: string,
  startDate: Date,
  endDate: Date | null,
  exdates: Set<string> = new Set()
): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const now = new Date();
  const fourWeeksFromNow = new Date(now.getTime() + 4 * 7 * 24 * 60 * 60 * 1000);
  
  // Parse RRULE
  const freqMatch = rrule.match(/FREQ=(\w+)/i);
  const freq = freqMatch ? freqMatch[1].toUpperCase() : null;
  
  // Get UNTIL date if specified
  const untilMatch = rrule.match(/UNTIL=(\d{8}(?:T\d{6}Z?)?)/i);
  let untilDate: Date | null = null;
  if (untilMatch) {
    const untilStr = untilMatch[1];
    if (untilStr.length === 8) {
      untilDate = new Date(
        parseInt(untilStr.slice(0, 4)),
        parseInt(untilStr.slice(4, 6)) - 1,
        parseInt(untilStr.slice(6, 8))
      );
    } else {
      untilDate = new Date(
        parseInt(untilStr.slice(0, 4)),
        parseInt(untilStr.slice(4, 6)) - 1,
        parseInt(untilStr.slice(6, 8)),
        parseInt(untilStr.slice(9, 11)),
        parseInt(untilStr.slice(11, 13)),
        parseInt(untilStr.slice(13, 15))
      );
    }
  }
  
  // Get COUNT if specified
  const countMatch = rrule.match(/COUNT=(\d+)/i);
  const maxCount = countMatch ? parseInt(countMatch[1]) : 52; // Default max 1 year
  
  // Calculate event duration
  const duration = endDate ? endDate.getTime() - startDate.getTime() : 2 * 60 * 60 * 1000; // Default 2 hours
  
  if (freq === 'WEEKLY') {
    let currentDate = new Date(startDate);
    let count = 0;

    while (currentDate <= fourWeeksFromNow && count < maxCount) {
      // Check UNTIL
      if (untilDate && currentDate > untilDate) break;

      const dateKey = currentDate.toISOString().slice(0, 10);

      // Skip dates excluded via EXDATE or modified via RECURRENCE-ID
      if (!exdates.has(dateKey)) {
        // Only add if in the future (or today)
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - 2); // Allow events from 2 hours ago

        if (currentDate >= cutoff) {
          const instanceEnd = new Date(currentDate.getTime() + duration);
          const instanceUid = `${baseEvent.gcal_uid}_${dateKey}`;

          events.push({
            ...baseEvent,
            gcal_uid: instanceUid,
            scheduled_at: currentDate.toISOString(),
            ends_at: instanceEnd.toISOString(),
          });
        }
      }

      // Move to next week
      currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      count++;
    }
  } else if (freq === 'DAILY') {
    let currentDate = new Date(startDate);
    let count = 0;

    while (currentDate <= fourWeeksFromNow && count < maxCount) {
      if (untilDate && currentDate > untilDate) break;

      const dateKey = currentDate.toISOString().slice(0, 10);

      if (!exdates.has(dateKey)) {
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - 2);

        if (currentDate >= cutoff) {
          const instanceEnd = new Date(currentDate.getTime() + duration);
          const instanceUid = `${baseEvent.gcal_uid}_${dateKey}`;

          events.push({
            ...baseEvent,
            gcal_uid: instanceUid,
            scheduled_at: currentDate.toISOString(),
            ends_at: instanceEnd.toISOString(),
          });
        }
      }

      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      count++;
    }
  } else {
    // For non-recurring or unsupported patterns, just return the base event if it's in the future
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 2);
    
    if (startDate >= cutoff) {
      events.push(baseEvent);
    }
  }
  
  return events;
}

// Parse iCal format — two-pass:
// Pass 1: collect all raw VEVENTs.
// Pass 2: expand RRULE events, excluding dates already covered by detached instances
//         (RECURRENCE-ID) or EXDATE, so RRULE never overwrites a detached edit.
function parseICal(icalData: string): ParsedEvent[] {
  const result: ParsedEvent[] = [];
  const cancelledUids: string[] = [];

  // Raw VEVENT data collected in pass 1
  const rawEvents: Record<string, string>[] = [];

  const lines = icalData.split(/\r?\n/);
  let inEvent = false;
  let currentEvent: Record<string, string> = {};
  let currentKey = '';

  // ── Pass 1: collect raw VEVENT records ─────────────────────────────────────
  for (const line of lines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (currentKey && currentEvent[currentKey] !== undefined) {
        currentEvent[currentKey] += line.slice(1);
      }
      continue;
    }
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
      currentKey = '';
      continue;
    }
    if (line === 'END:VEVENT') {
      inEvent = false;
      rawEvents.push(currentEvent);
      continue;
    }
    if (inEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      const fullKey = line.slice(0, colonIndex);
      const value = line.slice(colonIndex + 1);
      const key = fullKey.split(';')[0];
      // EXDATE may appear multiple times — accumulate
      if (key === 'EXDATE') {
        const prev = currentEvent['EXDATE'];
        currentEvent['EXDATE'] = prev ? `${prev},${value}` : value;
      } else {
        currentEvent[key] = value;
      }
      currentKey = key;
      if (key === 'DTSTART' || key === 'DTEND') {
        currentEvent[`${key}_RAW`] = fullKey;
      }
    }
  }

  // ── Pass 2: build events ────────────────────────────────────────────────────

  // First, collect all RECURRENCE-ID overrides: uid → set of date strings (UTC YYYY-MM-DD)
  // These dates must be excluded from RRULE expansion so detached instances always win.
  const recurrenceDates = new Map<string, Set<string>>();
  for (const ev of rawEvents) {
    const uid = ev['UID'];
    const recurrenceId = ev['RECURRENCE-ID'];
    if (!uid || !recurrenceId || ev['RRULE']) continue; // only detached (non-RRULE) instances
    const dtstartRaw = ev['DTSTART_RAW'] || '';
    const tzidMatch = dtstartRaw.match(/TZID=([^:;]+)/);
    const tzid = tzidMatch ? tzidMatch[1] : undefined;
    try {
      const recDate = parseICalDate(recurrenceId.replace(/^[^:]*:/, ''), tzid);
      if (!recurrenceDates.has(uid)) recurrenceDates.set(uid, new Set());
      recurrenceDates.get(uid)!.add(recDate.toISOString().slice(0, 10));
    } catch { /* skip unparseable RECURRENCE-IDs */ }
  }

  // Separate RRULE master events from non-RRULE (one-offs and detached instances)
  const rruleMasters: Record<string, string>[] = [];
  const nonRruleEvents: Record<string, string>[] = [];
  for (const ev of rawEvents) {
    if (ev['STATUS'] === 'CANCELLED') {
      // Collect cancellations
      const uid = ev['UID'];
      if (uid && !uid.startsWith('unknown_')) {
        const recurrenceId = ev['RECURRENCE-ID'];
        if (recurrenceId) {
          const dtstartRaw = ev['DTSTART_RAW'] || '';
          const tzidMatch = dtstartRaw.match(/TZID=([^:;]+)/);
          const tzid = tzidMatch ? tzidMatch[1] : undefined;
          try {
            const recDate = parseICalDate(recurrenceId.replace(/^[^:]*:/, ''), tzid);
            cancelledUids.push(`${uid}_${recDate.toISOString().slice(0, 10)}`);
          } catch { cancelledUids.push(uid); }
        } else {
          cancelledUids.push(uid);
        }
      }
      continue;
    }
    if (ev['RRULE']) {
      rruleMasters.push(ev);
    } else {
      nonRruleEvents.push(ev);
    }
  }

  function buildBaseEvent(ev: Record<string, string>, effectiveUid: string): ParsedEvent | null {
    const summary = ev['SUMMARY'] || '';
    const description = ev['DESCRIPTION'] || '';
    const dtstart = ev['DTSTART'];
    const dtend = ev['DTEND'];
    if (!dtstart) return null;
    const shouldSkip = SKIP_PATTERNS.some(p => p.test(summary));
    if (shouldSkip) return null;

    const dtstartRaw = ev['DTSTART_RAW'] || '';
    const tzidMatch = dtstartRaw.match(/TZID=([^:;]+)/);
    const tzid = tzidMatch ? tzidMatch[1] : undefined;
    const startDate = parseICalDate(dtstart, tzid);
    const endDate = dtend ? parseICalDate(dtend, tzid) : null;
    const gameId = detectGameId(summary);
    const combinedText = `${summary}\n${description}`;
    let entryFee = parseExplicitPrice(combinedText);
    let maxPlayers = parseMaxPlayers(combinedText);
    let attendanceXp = 30;
    let winXp = 10;
    let hasStream = false;
    const prizing = parsePrizing(combinedText);
    for (const override of EVENT_OVERRIDES) {
      if (override.pattern.test(summary)) {
        if (entryFee === null && override.entryFee !== undefined) entryFee = override.entryFee;
        if (maxPlayers === null && override.maxPlayers !== undefined) maxPlayers = override.maxPlayers;
        if (override.attendanceXp !== undefined) attendanceXp = override.attendanceXp;
        if (override.winXp !== undefined) winXp = override.winXp;
        if (override.hasStream !== undefined) hasStream = override.hasStream;
        break;
      }
    }
    const cleanDescription = description
      .replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';')
      .replace(/price\s*(?:is|:|-)\s*\$\d+(?:\.\d{2})?/gi, '')
      .replace(/players?\s*(?::|is)?\s*\d+/gi, '')
      .replace(/prizing\s*(?::|is|-)\s*.+?(?:\n|$)/gi, '')
      .trim();
    return {
      gcal_uid: effectiveUid,
      name: summary,
      game_id: gameId,
      description: cleanDescription || null,
      scheduled_at: startDate.toISOString(),
      ends_at: endDate?.toISOString() || null,
      entry_fee: entryFee,
      max_players: maxPlayers,
      has_stream: hasStream,
      attendance_xp: attendanceXp,
      win_xp: winXp,
      status: 'scheduled',
      prizing,
    };
  }

  // Expand RRULE masters, skipping dates covered by RECURRENCE-ID overrides or EXDATE
  for (const ev of rruleMasters) {
    const uid = ev['UID'] || `unknown_${Date.now()}`;
    const rrule = ev['RRULE']!;
    const dtstartRaw = ev['DTSTART_RAW'] || '';
    const tzidMatch = dtstartRaw.match(/TZID=([^:;]+)/);
    const tzid = tzidMatch ? tzidMatch[1] : undefined;
    if (!ev['DTSTART']) continue;
    const startDate = parseICalDate(ev['DTSTART'], tzid);
    const endDate = ev['DTEND'] ? parseICalDate(ev['DTEND'], tzid) : null;

    // Merge EXDATE + RECURRENCE-ID dates → all dates to exclude from expansion
    const excludeDates = new Set<string>(recurrenceDates.get(uid) || []);
    const exdateRaw = ev['EXDATE'] || '';
    if (exdateRaw) {
      for (const part of exdateRaw.split(',')) {
        const cleaned = part.trim().replace(/^[^:]*:/, '');
        if (cleaned) {
          try { excludeDates.add(parseICalDate(cleaned, tzid).toISOString().slice(0, 10)); } catch { /* skip */ }
        }
      }
    }

    const base = buildBaseEvent(ev, uid);
    if (!base) continue;
    const expanded = expandRecurringEvent(base, rrule, startDate, endDate, excludeDates);
    result.push(...expanded);
  }

  // Add one-off and detached instances (RECURRENCE-ID → uid_date key, wins over RRULE expansion)
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 2);
  for (const ev of nonRruleEvents) {
    const uid = ev['UID'] || `unknown_${Date.now()}`;
    const recurrenceId = ev['RECURRENCE-ID'];
    let effectiveUid = uid;
    if (recurrenceId) {
      const dtstartRaw = ev['DTSTART_RAW'] || '';
      const tzidMatch = dtstartRaw.match(/TZID=([^:;]+)/);
      const tzid = tzidMatch ? tzidMatch[1] : undefined;
      try {
        const recDate = parseICalDate(recurrenceId.replace(/^[^:]*:/, ''), tzid);
        effectiveUid = `${uid}_${recDate.toISOString().slice(0, 10)}`;
      } catch { /* fall back to bare uid */ }
    }
    const base = buildBaseEvent(ev, effectiveUid);
    if (!base) continue;
    if (new Date(base.scheduled_at) >= cutoff) {
      result.push(base);
    }
  }

  // Attach cancellation list for caller
  (result as any)._cancelledUids = cancelledUids;
  return result;
}

export async function POST(request: Request) {
  try {
    // Allow cron jobs (CRON_SECRET) or network admins to sync
    const isCron = request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
    if (!isCron) {
      const staffCtx = await requireNetworkAdmin();
      if (!staffCtx) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Require a storeId so events are always scoped to a store
    const body = await request.json().catch(() => ({})) as { storeId?: string };
    const storeId = body?.storeId;
    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required to scope synced events to a store' },
        { status: 400 }
      );
    }

    // Look up this store's iCal URL from the DB
    const { data: storeData } = await supabaseAdmin
      .from('stores')
      .select('ical_url, name')
      .eq('id', storeId)
      .single();

    const ICAL_URL = storeData?.ical_url || '';

    console.log(`Starting calendar sync for ${storeData?.name}...`);

    if (!ICAL_URL) {
      return NextResponse.json({
        error: 'No Google Calendar URL set for this store. Paste the secret iCal URL in HQ → Events → Calendar Sync.',
      }, { status: 400 });
    }

    console.log('Fetching calendar...');

    let icalData: string;
    try {
      icalData = await fetchICalSafe(ICAL_URL);
    } catch (fetchError: any) {
      console.error('Calendar fetch error:', fetchError?.message);
      return NextResponse.json({ error: fetchError?.message || 'Failed to fetch calendar' }, { status: 500 });
    }

    console.log('Fetched iCal data, length:', icalData.length);
    
    // Parse events
    const parsedEvents = parseICal(icalData);
    console.log('Parsed events:', parsedEvents.length);
    
    // Filter to future events only (or past 24 hours for recently completed)
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);
    
    const futureEvents = parsedEvents.filter(e => new Date(e.scheduled_at) >= cutoff);
    console.log('Future events:', futureEvents.length);
    
    if (futureEvents.length === 0) {
      return NextResponse.json({ 
        message: 'No upcoming events found in calendar',
        synced: 0,
        total: parsedEvents.length
      });
    }
    
    // Upsert events to Supabase first, then delete cancellations.
    // Deletion runs last so that even if EXDATE parsing misses a cancelled date,
    // the STATUS:CANCELLED cleanup still wins.
    let synced = 0;
    let errors: string[] = [];
    
    for (const event of futureEvents) {
      try {
        // Check if event exists by gcal_uid
        const { data: existing } = await supabaseAdmin
          .from('events')
          .select('id')
          .eq('gcal_uid', event.gcal_uid)
          .maybeSingle();
        
        if (existing) {
          // Update existing event - calendar is source of truth
          const { error } = await supabaseAdmin
            .from('events')
            .update({
              name: event.name,
              game_id: event.game_id,
              description: event.description,
              scheduled_at: event.scheduled_at,
              ends_at: event.ends_at,
              entry_fee: event.entry_fee,
              max_players: event.max_players,
              has_stream: event.has_stream,
              attendance_xp: event.attendance_xp,
              win_xp: event.win_xp,
              prizing: event.prizing,
              store_id: storeId,
            })
            .eq('id', existing.id);
          
          if (error) {
            console.error('Error updating event:', error);
            errors.push(`Update ${event.name}: ${error.message}`);
          } else {
            synced++;
          }
        } else {
          // Insert new event
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const insertData: any = {
            gcal_uid: event.gcal_uid,
            name: event.name,
            game_id: event.game_id,
            description: event.description,
            scheduled_at: event.scheduled_at,
            ends_at: event.ends_at,
            entry_fee: event.entry_fee,
            max_players: event.max_players,
            has_stream: event.has_stream,
            attendance_xp: event.attendance_xp,
            win_xp: event.win_xp,
            status: 'scheduled' as const,
            current_players: 0,
            prizing: event.prizing,
            store_id: storeId,
          };
          const { error } = await supabaseAdmin
            .from('events')
            .insert(insertData);
          
          if (error) {
            console.error('Error inserting event:', error);
            errors.push(`Insert ${event.name}: ${error.message}`);
          } else {
            synced++;
            // Announce new event to all members (non-blocking)
            const eventDate = new Date(event.scheduled_at);
            const dateLabel = eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' });
            notifyStorePlayers(
              storeId,
              'event_announced',
              `📣 New event: ${event.name}`,
              `${dateLabel} — check Events for details and mark yourself as interested.`,
              { event_name: event.name, scheduled_at: event.scheduled_at, game_id: event.game_id ?? '' },
              'events'
            ).catch(() => {});
          }
        }
      } catch (err) {
        console.error('Error processing event:', event.name, err);
        errors.push(`Process ${event.name}: ${err}`);
      }
    }
    
    // Delete cancelled events (STATUS:CANCELLED in iCal feed).
    const cancelledUids: string[] = (parsedEvents as any)._cancelledUids || [];
    for (const cancelUid of cancelledUids) {
      const isSpecificOccurrence = /^.+_\d{4}-\d{2}-\d{2}$/.test(cancelUid);
      if (isSpecificOccurrence) {
        await supabaseAdmin
          .from('events')
          .delete()
          .eq('gcal_uid', cancelUid)
          .in('status', ['scheduled']);
      } else {
        await supabaseAdmin
          .from('events')
          .delete()
          .or(`gcal_uid.eq.${cancelUid},gcal_uid.like.${cancelUid}_%`)
          .in('status', ['scheduled']);
      }
    }

    // Stale-event cleanup — remove scheduled future events sourced from this
    // store's calendar that no longer appear in the current snapshot.
    //
    // Safety gates (all must pass before any row is deleted):
    // 1. Fetch and parse completed without fatal error (we are past those throws).
    // 2. No per-event upsert errors — partial feeds can cause false "missing" signals.
    // 3. Snapshot is non-empty — an empty parse is never a valid complete feed.
    // 4. Deletion count anomaly guard — reject if > 10 events or > 30% of snapshot
    //    would be deleted, which likely indicates a truncated or incorrect feed.
    // 5. Scoped to store_id + gcal_uid IS NOT NULL — never touches manually created
    //    events, network events (store_id IS NULL), or another store's events.
    const syncedUids = new Set(futureEvents.map(e => e.gcal_uid));
    const cleanupEligible = errors.length === 0 && syncedUids.size > 0;

    if (cleanupEligible) {
      const { data: existingRows } = await supabaseAdmin
        .from('events')
        .select('id, gcal_uid')
        .eq('store_id', storeId)          // scoped to this store only
        .eq('status', 'scheduled')
        .not('gcal_uid', 'is', null)      // only calendar-sourced events
        .gte('scheduled_at', cutoff.toISOString());

      const staleIds = (existingRows || [])
        .filter(row => row.gcal_uid && !syncedUids.has(row.gcal_uid))
        .map(row => row.id);

      // Anomaly guard: abort if deletion looks disproportionately large
      const anomalyThreshold = Math.max(10, Math.floor(syncedUids.size * 0.3));
      if (staleIds.length > anomalyThreshold) {
        console.warn(
          `Stale cleanup aborted: would delete ${staleIds.length} events ` +
          `(snapshot has ${syncedUids.size}, threshold ${anomalyThreshold}). ` +
          `Possible truncated feed — manual review required.`
        );
        errors.push(
          `Stale cleanup skipped: ${staleIds.length} events absent from snapshot ` +
          `(exceeds safety threshold of ${anomalyThreshold}). Manual review required.`
        );
      } else if (staleIds.length > 0) {
        await supabaseAdmin
          .from('events')
          .delete()
          .in('id', staleIds);
      }
    }

    return NextResponse.json({
      message: `Synced ${synced} events from Google Calendar`,
      synced,
      total: futureEvents.length,
      errors: errors.length > 0 ? errors : undefined,
    });
    
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Check sync status / preview what would sync
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    let ICAL_URL = '';
    if (storeId) {
      const { data } = await supabaseAdmin.from('stores').select('ical_url').eq('id', storeId).single();
      ICAL_URL = data?.ical_url || '';
    }

    if (!ICAL_URL) {
      return NextResponse.json({ error: 'Calendar URL not configured for this store' }, { status: 400 });
    }

    // Fetch the iCal feed
    const response = await fetch(ICAL_URL, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Failed to fetch calendar' 
      }, { status: 500 });
    }
    
    const icalData = await response.text();
    const parsedEvents = parseICal(icalData);
    
    // Filter to future events
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);
    const futureEvents = parsedEvents.filter(e => new Date(e.scheduled_at) >= cutoff);
    
    // Get existing gcal_uids from database
    const { data: existingEvents } = await supabaseAdmin
      .from('events')
      .select('gcal_uid')
      .not('gcal_uid', 'is', null);

    const existingUids = new Set(existingEvents?.map((e) => e.gcal_uid) || []);
    
    // Categorize events
    const newEvents = futureEvents.filter(e => !existingUids.has(e.gcal_uid));
    const existingCount = futureEvents.filter(e => existingUids.has(e.gcal_uid)).length;
    
    return NextResponse.json({
      calendar: {
        totalParsed: parsedEvents.length,
        upcoming: futureEvents.length,
        new: newEvents.length,
        existing: existingCount,
      },
      preview: futureEvents.slice(0, 10).map(e => ({
        name: e.name,
        game: e.game_id,
        date: new Date(e.scheduled_at).toLocaleDateString(),
        time: new Date(e.scheduled_at).toLocaleTimeString(),
        prizing: e.prizing,
        isNew: !existingUids.has(e.gcal_uid),
      })),
    });
    
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
