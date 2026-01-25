import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface GameStats {
  gameId: string;
  totalXp: number;
  totalEvents: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  bestPlacement: number | null;
  undefeatedCount: number;
  currentStreak: number;
  playingSince: string | null;
  monthlyEvents: number;
  monthlyXp: number;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get player ID from Clerk user ID
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const playerId = player.id;

    // Get aggregated XP stats per game from the view
    const { data: gameXpData, error: gameXpError } = await supabase
      .from('player_game_xp')
      .select('game_id, game_xp, game_events, game_wins')
      .eq('player_id', playerId);

    if (gameXpError) {
      console.error('Error fetching game XP:', gameXpError);
      return NextResponse.json({ error: 'Failed to fetch game stats' }, { status: 500 });
    }

    // Get current month for monthly stats
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get monthly XP per game
    const { data: monthlyXpData, error: monthlyXpError } = await supabase
      .from('player_monthly_xp')
      .select('game_id, monthly_xp')
      .eq('player_id', playerId)
      .eq('month', currentMonth);

    if (monthlyXpError) {
      console.error('Error fetching monthly XP:', monthlyXpError);
    }

    // Get detailed event attendance for additional stats
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('event_attendance')
      .select(`
        event_id,
        wins,
        losses,
        final_standing,
        is_undefeated,
        checked_in_at,
        events!inner (
          game_id,
          scheduled_at
        )
      `)
      .eq('player_id', playerId)
      .order('checked_in_at', { ascending: false });

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError);
      return NextResponse.json({ error: 'Failed to fetch attendance data' }, { status: 500 });
    }

    // Process stats per game
    const gameStatsMap = new Map<string, GameStats>();

    // Initialize with game XP data
    for (const game of gameXpData || []) {
      if (game.game_id) {
        gameStatsMap.set(game.game_id, {
          gameId: game.game_id,
          totalXp: game.game_xp || 0,
          totalEvents: game.game_events || 0,
          totalWins: game.game_wins || 0,
          totalLosses: 0,
          winRate: 0,
          bestPlacement: null,
          undefeatedCount: 0,
          currentStreak: 0,
          playingSince: null,
          monthlyEvents: 0,
          monthlyXp: 0,
        });
      }
    }

    // Add monthly XP data
    for (const monthly of monthlyXpData || []) {
      if (monthly.game_id && gameStatsMap.has(monthly.game_id)) {
        const stats = gameStatsMap.get(monthly.game_id)!;
        stats.monthlyXp = monthly.monthly_xp || 0;
      }
    }

    // Process attendance data for detailed stats
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Group attendance by game for streak calculation
    const gameAttendanceMap = new Map<string, typeof attendanceData>();
    
    for (const attendance of attendanceData || []) {
      const gameId = (attendance.events as any)?.game_id;
      if (!gameId) continue;

      // Initialize game stats if not exists
      if (!gameStatsMap.has(gameId)) {
        gameStatsMap.set(gameId, {
          gameId,
          totalXp: 0,
          totalEvents: 0,
          totalWins: 0,
          totalLosses: 0,
          winRate: 0,
          bestPlacement: null,
          undefeatedCount: 0,
          currentStreak: 0,
          playingSince: null,
          monthlyEvents: 0,
          monthlyXp: 0,
        });
      }

      const stats = gameStatsMap.get(gameId)!;

      // Track losses
      if (attendance.losses) {
        stats.totalLosses += attendance.losses;
      }

      // Track best placement
      if (attendance.final_standing !== null) {
        if (stats.bestPlacement === null || attendance.final_standing < stats.bestPlacement) {
          stats.bestPlacement = attendance.final_standing;
        }
      }

      // Track undefeated events
      if (attendance.is_undefeated) {
        stats.undefeatedCount++;
      }

      // Track playing since (earliest date)
      if (attendance.checked_in_at) {
        if (!stats.playingSince || attendance.checked_in_at < stats.playingSince) {
          stats.playingSince = attendance.checked_in_at;
        }
      }

      // Track monthly events
      const eventDate = new Date((attendance.events as any)?.scheduled_at || attendance.checked_in_at);
      if (eventDate >= currentMonthStart) {
        stats.monthlyEvents++;
      }

      // Group for streak calculation
      if (!gameAttendanceMap.has(gameId)) {
        gameAttendanceMap.set(gameId, []);
      }
      gameAttendanceMap.get(gameId)!.push(attendance);
    }

    // Calculate win streaks per game
    for (const [gameId, attendances] of Array.from(gameAttendanceMap.entries())) {
      const stats = gameStatsMap.get(gameId)!;
      
      // Attendances are already sorted by date descending
      let streak = 0;
      for (const att of attendances) {
        // A "win" for streak purposes: had wins and no losses, or is undefeated
        const wins = att.wins || 0;
        const losses = att.losses || 0;
        
        if (wins > 0 && losses === 0) {
          streak++;
        } else if (wins > losses) {
          streak++;
        } else {
          break; // Streak broken
        }
      }
      stats.currentStreak = streak;
    }

    // Calculate win rates
    for (const stats of Array.from(gameStatsMap.values())) {
      const totalMatches = stats.totalWins + stats.totalLosses;
      if (totalMatches > 0) {
        stats.winRate = Math.round((stats.totalWins / totalMatches) * 100);
      }
    }

    // Convert to array
    const gameStats = Array.from(gameStatsMap.values());

    return NextResponse.json({
      success: true,
      stats: gameStats,
    });

  } catch (error) {
    console.error('Error in game-stats API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
