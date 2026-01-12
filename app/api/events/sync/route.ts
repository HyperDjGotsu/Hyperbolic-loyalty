import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// Google Calendar iCal URL (use secret address from env)
const ICAL_URL = process.env.GOOGLE_CALENDAR_ICAL_URL || '';

// Game detection from event titles
const GAME_PATTERNS: { pattern: RegExp; id: string }[] = [
  { pattern: /one\s*piece/i, id: 'one_piece' },
  { pattern: /gundam/i, id: 'gundam' },
  { pattern: /pokemon|pokémon/i, id: 'pokemon' },
  { pattern: /magic|mtg|friday\s*night\s*magic|fnm/i, id: 'mtg' },
  { pattern: /star\s*wars\s*unlimited|swu/i, id: 'star_wars_unlimited' },  // More specific - must have "unlimited"
  { pattern: /vanguard|cfv/i, id: 'vanguard' },
  { pattern: /dragon\s*ball|dbz|dbs|dbscg/i, id: 'dragonball' },
  { pattern: /lorcana/i, id: 'lorcana' },
  { pattern: /yu-?gi-?oh|yugioh/i, id: 'yugioh' },
  { pattern: /digimon/i, id: 'digimon' },
  { pattern: /weiss|schwarz/i, id: 'weiss_schwarz' },
  { pattern: /union\s*arena/i, id: 'union_arena' },
  { pattern: /warhammer|40k|kill\s*team/i, id: 'warhammer' },
  { pattern: /star\s*wars\s*legion|sw\s*legion|legion/i, id: 'sw_legion' },
  { pattern: /flesh.*blood|fab/i, id: 'fab' },
  { pattern: /hololive/i, id: 'hololive' },
  { pattern: /riftbound/i, id: 'riftbound' },
  { pattern: /uvs|universus/i, id: 'uvs' },
  { pattern: /elite\s*spark/i, id: 'elite_spark' },  // If this is a game you run
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
    // and let the server interpret it. For simplicity, we'll create an ISO string
    // that represents the intended local time.
    if (tzid?.includes('Los_Angeles') || tzid?.includes('Pacific')) {
      // Create date string in Pacific time, then convert to UTC
      // Pacific is UTC-8 (or UTC-7 in DST)
      const date = new Date(Date.UTC(year, month, day, hour, minute, second));
      // Add 8 hours to convert from Pacific to UTC (simplified, doesn't account for DST perfectly)
      const isDST = month >= 2 && month <= 10; // Rough DST check (Mar-Nov)
      date.setUTCHours(date.getUTCHours() + (isDST ? 7 : 8));
      return date;
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
// Matches: "16 spots", "max 32", "32 players max", "spots: 24", "limit 16"
function parseMaxPlayers(text: string): number | null {
  const patterns = [
    /(\d+)\s*(?:spots?|seats?|players?)\s*(?:open|available|max)?/i,  // "16 spots" or "32 players"
    /(?:max|limit|capacity)(?:\s*:)?\s*(\d+)/i,                        // "max 32" or "limit: 16"
    /(?:spots?|seats?|players?)(?:\s*:)?\s*(\d+)/i,                    // "spots: 24"
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

// Expand recurring events into individual instances
// Supports WEEKLY recurrence for the next 4 weeks
function expandRecurringEvent(
  baseEvent: ParsedEvent, 
  rrule: string, 
  startDate: Date,
  endDate: Date | null
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
      
      // Only add if in the future (or today)
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - 2); // Allow events from 2 hours ago
      
      if (currentDate >= cutoff) {
        const instanceEnd = new Date(currentDate.getTime() + duration);
        const instanceUid = `${baseEvent.gcal_uid}_${currentDate.toISOString().slice(0, 10)}`;
        
        events.push({
          ...baseEvent,
          gcal_uid: instanceUid,
          scheduled_at: currentDate.toISOString(),
          ends_at: instanceEnd.toISOString(),
        });
      }
      
      // Move to next week
      currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      count++;
    }
  } else if (freq === 'DAILY') {
    let currentDate = new Date(startDate);
    let count = 0;
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    while (currentDate <= twoWeeksFromNow && count < maxCount) {
      if (untilDate && currentDate > untilDate) break;
      
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - 2);
      
      if (currentDate >= cutoff) {
        const instanceEnd = new Date(currentDate.getTime() + duration);
        const instanceUid = `${baseEvent.gcal_uid}_${currentDate.toISOString().slice(0, 10)}`;
        
        events.push({
          ...baseEvent,
          gcal_uid: instanceUid,
          scheduled_at: currentDate.toISOString(),
          ends_at: instanceEnd.toISOString(),
        });
      }
      
      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      count++;
    }
  } else {
    // Unknown frequency, just return the base event
    events.push(baseEvent);
  }
  
  return events;
}

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
}

// Get overrides for event
function getOverrides(title: string, description?: string | null): { entryFee?: number; maxPlayers?: number; attendanceXp?: number; winXp?: number; hasStream?: boolean } {
  const result: { entryFee?: number; maxPlayers?: number; attendanceXp?: number; winXp?: number; hasStream?: boolean } = {};
  
  // First check for explicit price in title or description
  const explicitPrice = parseExplicitPrice(title) ?? (description ? parseExplicitPrice(description) : null);
  if (explicitPrice !== null) {
    result.entryFee = explicitPrice;
  }
  
  // Check for explicit max players in title or description
  const explicitMaxPlayers = parseMaxPlayers(title) ?? (description ? parseMaxPlayers(description) : null);
  if (explicitMaxPlayers !== null) {
    result.maxPlayers = explicitMaxPlayers;
  }
  
  // Then apply keyword-based overrides (won't override explicit values)
  for (const override of EVENT_OVERRIDES) {
    if (override.pattern.test(title)) {
      if (result.entryFee === undefined && override.entryFee !== undefined) {
        result.entryFee = override.entryFee;
      }
      if (result.maxPlayers === undefined && override.maxPlayers !== undefined) {
        result.maxPlayers = override.maxPlayers;
      }
      if (override.attendanceXp !== undefined) result.attendanceXp = override.attendanceXp;
      if (override.winXp !== undefined) result.winXp = override.winXp;
      if (override.hasStream !== undefined) result.hasStream = override.hasStream;
      break;
    }
  }
  
  return result;
}

// Parse iCal feed into events
function parseICal(icalData: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const lines = icalData.split(/\r?\n/);
  
  let currentEvent: Record<string, string> = {};
  let inEvent = false;
  let currentKey = '';
  
  for (const line of lines) {
    // Handle line continuations
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (currentKey && currentEvent[currentKey]) {
        currentEvent[currentKey] += line.slice(1);
      }
      continue;
    }
    
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
    } else if (line === 'END:VEVENT') {
      inEvent = false;
      
      if (currentEvent['SUMMARY'] && currentEvent['DTSTART']) {
        const title = (currentEvent['SUMMARY'] || '').replace(/\\,/g, ',');
        
        // Skip non-game events like "Store Open Hours"
        const shouldSkip = SKIP_PATTERNS.some(pattern => pattern.test(title));
        
        if (!shouldSkip) {
          const gameId = detectGameId(title);
          
          // Get description (parse early so we can check for price)
          const description = (currentEvent['DESCRIPTION'] || '')
            .replace(/\\,/g, ',')
            .replace(/\\n/g, '\n')
            .replace(/\\;/g, ';')
            .trim() || null;
          
          const overrides = getOverrides(title, description);
          
          // Parse start date with timezone
          const startRaw = currentEvent['DTSTART_RAW'] || currentEvent['DTSTART'] || '';
          let startTzid: string | undefined;
          let startDateStr = currentEvent['DTSTART'] || '';
          
          // Extract TZID if present (e.g., "TZID=America/Los_Angeles:20250117T173000")
          const tzMatch = startRaw.match(/TZID=([^:;]+)/i);
          if (tzMatch) {
            startTzid = tzMatch[1];
          }
          if (startDateStr.includes(':')) {
            startDateStr = startDateStr.split(':').pop() || startDateStr;
          }
          const startDate = parseICalDate(startDateStr, startTzid);
          
          // Parse end date with timezone
          const endRaw = currentEvent['DTEND_RAW'] || currentEvent['DTEND'] || '';
          let endTzid: string | undefined;
          let endDateStr = currentEvent['DTEND'] || '';
          
          const endTzMatch = endRaw.match(/TZID=([^:;]+)/i);
          if (endTzMatch) {
            endTzid = endTzMatch[1];
          }
          if (endDateStr.includes(':')) {
            endDateStr = endDateStr.split(':').pop() || endDateStr;
          }
          const endDate = endDateStr ? parseICalDate(endDateStr, endTzid) : null;
          
          // Get UID
          const uid = currentEvent['UID'] || `gcal-${startDate.getTime()}-${title.slice(0, 20)}`;
          
          // Clean up title (remove "GoM" prefix)
          const cleanName = title.replace(/^GoM\s*/i, '').trim();
          
          // Build base event
          const baseEvent: ParsedEvent = {
            gcal_uid: uid,
            name: cleanName,
            game_id: gameId,
            description: description,
            scheduled_at: startDate.toISOString(),
            ends_at: endDate ? endDate.toISOString() : null,
            entry_fee: overrides.entryFee ?? null,
            max_players: overrides.maxPlayers ?? null,
            has_stream: overrides.hasStream ?? false,
            attendance_xp: overrides.attendanceXp ?? 20,
            win_xp: overrides.winXp ?? 10,
            status: 'scheduled',
          };
          
          // Check for recurrence rule
          const rrule = currentEvent['RRULE'];
          
          if (rrule) {
            // Expand recurring event into instances
            const instances = expandRecurringEvent(baseEvent, rrule, startDate, endDate);
            events.push(...instances);
          } else {
            // Single event
            events.push(baseEvent);
          }
        }
      }
    } else if (inEvent && line.includes(':')) {
      const colonIndex = line.indexOf(':');
      const fullKey = line.slice(0, colonIndex);
      const value = line.slice(colonIndex + 1);
      
      // Extract base key (without parameters like TZID)
      let key = fullKey;
      if (fullKey.includes(';')) {
        key = fullKey.split(';')[0];
      }
      
      currentEvent[key] = value;
      currentKey = key;
      
      // Store raw line for DTSTART/DTEND to extract timezone later
      if (key === 'DTSTART' || key === 'DTEND') {
        currentEvent[`${key}_RAW`] = fullKey;
      }
    }
  }
  
  return events;
}

export async function POST(request: Request) {
  try {
    // Optional: require auth for sync
    // const { userId } = await auth();
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('Starting calendar sync...');
    
    if (!ICAL_URL) {
      return NextResponse.json({ 
        error: 'Calendar URL not configured. Set GOOGLE_CALENDAR_ICAL_URL in environment variables.',
      }, { status: 500 });
    }
    
    console.log('Fetching calendar...');
    
    // Fetch the iCal feed
    let response;
    try {
      response = await fetch(ICAL_URL, {
        cache: 'no-store', // Always fetch fresh
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HyperbolicLoyalty/1.0)',
        },
      });
    } catch (fetchError) {
      console.error('Fetch threw error:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch calendar - network error',
        details: String(fetchError)
      }, { status: 500 });
    }
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read response');
      console.error('Failed to fetch calendar:', response.status, errorText);
      return NextResponse.json({ 
        error: 'Failed to fetch calendar',
        status: response.status,
        details: errorText.slice(0, 500)
      }, { status: 500 });
    }
    
    const icalData = await response.text();
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
    
    // Upsert events to Supabase
    let synced = 0;
    let errors: string[] = [];
    
    for (const event of futureEvents) {
      try {
        // Check if event exists by gcal_uid
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existing } = await (supabaseAdmin
          .from('events')
          .select('id')
          .eq('gcal_uid', event.gcal_uid)
          .single() as any);
        
        if (existing) {
          // Update existing event
          const { error } = await supabaseAdmin
            .from('events')
            .update({
              name: event.name,
              game_id: event.game_id,
              description: event.description,
              scheduled_at: event.scheduled_at,
              ends_at: event.ends_at,
              // Don't overwrite these if they were manually set:
              // entry_fee, max_players, has_stream, attendance_xp, win_xp
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
          };
          const { error } = await supabaseAdmin
            .from('events')
            .insert(insertData);
          
          if (error) {
            console.error('Error inserting event:', error);
            errors.push(`Insert ${event.name}: ${error.message}`);
          } else {
            synced++;
          }
        }
      } catch (err) {
        console.error('Error processing event:', event.name, err);
        errors.push(`Process ${event.name}: ${err}`);
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
    if (!ICAL_URL) {
      return NextResponse.json({ 
        error: 'Calendar URL not configured' 
      }, { status: 500 });
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingEvents } = await (supabaseAdmin
      .from('events')
      .select('gcal_uid')
      .not('gcal_uid', 'is', null) as any);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingUids = new Set(existingEvents?.map((e: any) => e.gcal_uid) || []);
    
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
        isNew: !existingUids.has(e.gcal_uid),
      })),
    });
    
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
