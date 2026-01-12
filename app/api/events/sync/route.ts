import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// Google Calendar iCal URL
const ICAL_URL = 'https://calendar.google.com/calendar/ical/ecab33faca7be64c1c7331361ed56d301e429468e4e45d6356b1836991c45d14%40group.calendar.google.com/public/basic.ics';

// Game detection from event titles
const GAME_PATTERNS: { pattern: RegExp; id: string }[] = [
  { pattern: /one\s*piece/i, id: 'one_piece' },
  { pattern: /gundam/i, id: 'gundam' },
  { pattern: /pokemon|pokémon/i, id: 'pokemon' },
  { pattern: /magic|mtg/i, id: 'mtg' },
  { pattern: /star\s*wars|swu/i, id: 'star_wars_unlimited' },
  { pattern: /vanguard/i, id: 'vanguard' },
  { pattern: /dragon\s*ball|dbz|dbs/i, id: 'dragonball' },
  { pattern: /lorcana/i, id: 'lorcana' },
  { pattern: /yu-?gi-?oh|yugioh/i, id: 'yugioh' },
  { pattern: /digimon/i, id: 'digimon' },
  { pattern: /weiss|schwarz/i, id: 'weiss_schwarz' },
  { pattern: /union\s*arena/i, id: 'union_arena' },
  { pattern: /warhammer|40k/i, id: 'warhammer' },
  { pattern: /legion/i, id: 'sw_legion' },
  { pattern: /flesh.*blood|fab/i, id: 'fab' },
  { pattern: /hololive/i, id: 'hololive' },
  { pattern: /riftbound/i, id: 'riftbound' },
  { pattern: /uvs/i, id: 'uvs' },
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

// Parse iCal date format
function parseICalDate(dateStr: string): Date {
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

// Get overrides for event
function getOverrides(title: string): { entryFee?: number; maxPlayers?: number; attendanceXp?: number; winXp?: number; hasStream?: boolean } {
  for (const override of EVENT_OVERRIDES) {
    if (override.pattern.test(title)) {
      return override;
    }
  }
  return {};
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
        const gameId = detectGameId(title);
        const overrides = getOverrides(title);
        
        // Parse start date
        let startDateStr = currentEvent['DTSTART'] || '';
        if (startDateStr.includes(':')) {
          startDateStr = startDateStr.split(':').pop() || startDateStr;
        }
        const startDate = parseICalDate(startDateStr);
        
        // Parse end date
        let endDateStr = currentEvent['DTEND'] || '';
        if (endDateStr.includes(':')) {
          endDateStr = endDateStr.split(':').pop() || endDateStr;
        }
        const endDate = endDateStr ? parseICalDate(endDateStr) : null;
        
        // Get description
        const description = (currentEvent['DESCRIPTION'] || '')
          .replace(/\\,/g, ',')
          .replace(/\\n/g, '\n')
          .replace(/\\;/g, ';')
          .trim() || null;
        
        // Get UID
        const uid = currentEvent['UID'] || `gcal-${startDate.getTime()}-${title.slice(0, 20)}`;
        
        // Clean up title (remove "GoM" prefix)
        const cleanName = title.replace(/^GoM\s*/i, '').trim();
        
        events.push({
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
        });
      }
    } else if (inEvent && line.includes(':')) {
      const colonIndex = line.indexOf(':');
      let key = line.slice(0, colonIndex);
      const value = line.slice(colonIndex + 1);
      
      if (key.includes(';')) {
        key = key.split(';')[0];
      }
      
      currentEvent[key] = value;
      currentKey = key;
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
    
    // Fetch the iCal feed
    const response = await fetch(ICAL_URL, {
      cache: 'no-store', // Always fetch fresh
    });
    
    if (!response.ok) {
      console.error('Failed to fetch calendar:', response.status);
      return NextResponse.json({ 
        error: 'Failed to fetch calendar',
        status: response.status 
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
        const { data: existing } = await supabaseAdmin
          .from('events')
          .select('id')
          .eq('gcal_uid', event.gcal_uid)
          .single();
        
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
          const { error } = await supabaseAdmin
            .from('events')
            .insert({
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
              status: event.status,
              current_players: 0,
            });
          
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
    
    const existingUids = new Set(existingEvents?.map(e => e.gcal_uid) || []);
    
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
