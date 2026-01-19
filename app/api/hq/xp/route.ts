import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Pirate's Life / Hyperlife configuration
const MONTHLY_THRESHOLD: Record<string, number> = {
  one_piece: 6,  // 2x/week = ~8 events/month, need 6
};
const DEFAULT_THRESHOLD = 3;  // 1x/week = ~4 events/month, need 3
const MONTHLY_BONUS_XP = 30;

// Get current month boundaries (Pacific Time)
function getCurrentMonthBoundaries(): { start: string; end: string; monthLabel: string; monthKey: string } {
  const now = new Date();
  const pacificNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  
  const year = pacificNow.getFullYear();
  const month = pacificNow.getMonth();
  
  const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
  const startOfNextMonth = new Date(year, month + 1, 1, 0, 0, 0, 0);
  
  const start = startOfMonth.toISOString();
  const end = startOfNextMonth.toISOString();
  
  // Month key for tracking (e.g., "2026-01")
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  
  // Human readable month (e.g., "January 2026")
  const monthLabel = pacificNow.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  
  return { start, end, monthLabel, monthKey };
}

// Check if player has already earned the monthly bonus for this game
async function hasEarnedMonthlyBonus(playerId: string, gameId: string, monthStart: string, monthEnd: string): Promise<boolean> {
  const achievementName = gameId === 'one_piece' ? "Pirate's Life" : 'Hyperlife';
  
  const { data } = await supabaseAdmin
    .from('xp_ledger')
    .select('id')
    .eq('player_id', playerId)
    .eq('game_id', gameId)
    .gte('created_at', monthStart)
    .lt('created_at', monthEnd)
    .ilike('description', `%${achievementName}%`)
    .limit(1);
  
  return data !== null && data.length > 0;
}

// Count monthly attendance for a player/game
async function getMonthlyAttendanceCount(playerId: string, gameId: string, monthStart: string, monthEnd: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('xp_ledger')
    .select('id, description')
    .eq('player_id', playerId)
    .eq('game_id', gameId)
    .gte('created_at', monthStart)
    .lt('created_at', monthEnd);
  
  if (!data) return 0;
  
  // Count entries that include "Attended" in description
  return data.filter(entry => 
    entry.description && entry.description.includes('Attended')
  ).length;
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify staff
    const { data: staffCheck } = await supabaseAdmin
      .from('players')
      .select('id, is_staff, player_id')
      .eq('clerk_user_id', userId)
      .single();

    if (!staffCheck?.is_staff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { playerId, gameId, amount, reason } = body;

    if (!playerId || !gameId || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Add XP entry
    const { error: insertError } = await supabaseAdmin
      .from('xp_ledger')
      .insert({
        player_id: playerId,
        game_id: gameId,
        base_xp: amount,
        final_xp: amount,
        multiplier: 1,
        description: reason || (amount > 0 ? 'Admin adjustment' : 'Admin correction'),
        source: 'manual_adjustment',
        awarded_by: staffCheck.id,
      });

    if (insertError) {
      console.error('XP insert error:', insertError);
      return NextResponse.json({ error: 'Failed to add XP' }, { status: 500 });
    }

    // ================================================
    // AUTO-AWARD: Pirate's Life / Hyperlife Check
    // ================================================
    let bonusAwarded = false;
    let achievementName = '';
    
    // Only check if this was an attendance entry
    if (reason && reason.includes('Attended')) {
      const { start: monthStart, end: monthEnd, monthLabel } = getCurrentMonthBoundaries();
      const threshold = MONTHLY_THRESHOLD[gameId] || DEFAULT_THRESHOLD;
      achievementName = gameId === 'one_piece' ? "Pirate's Life" : 'Hyperlife';
      
      // Check if already earned this month
      const alreadyEarned = await hasEarnedMonthlyBonus(playerId, gameId, monthStart, monthEnd);
      
      if (!alreadyEarned) {
        // Count attendance this month (including the one we just added)
        const attendanceCount = await getMonthlyAttendanceCount(playerId, gameId, monthStart, monthEnd);
        
        // If they just hit the threshold, award the bonus!
        if (attendanceCount >= threshold) {
          const bonusDescription = `${achievementName} - ${monthLabel}`;
          
          const { error: bonusError } = await supabaseAdmin
            .from('xp_ledger')
            .insert({
              player_id: playerId,
              game_id: gameId,
              base_xp: MONTHLY_BONUS_XP,
              final_xp: MONTHLY_BONUS_XP,
              multiplier: 1,
              description: bonusDescription,
              source: 'achievement',
              awarded_by: staffCheck.id,
            });
          
          if (bonusError) {
            console.error('Bonus XP insert error:', bonusError);
            // Don't fail the whole request, just log it
          } else {
            bonusAwarded = true;
            console.log(`🏴 ${achievementName} awarded to player ${playerId} for ${gameId}!`);
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      bonusAwarded,
      achievementName: bonusAwarded ? achievementName : null,
      bonusXp: bonusAwarded ? MONTHLY_BONUS_XP : 0,
    });
  } catch (error) {
    console.error('XP add error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
