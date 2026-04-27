import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const PRIZES = [
  { xp: 5,   label: 'Rusty Anchor',     rarity: 'common',    weight: 40 },
  { xp: 10,  label: "Navigator's Log",  rarity: 'uncommon',  weight: 30 },
  { xp: 25,  label: 'Rare Find',        rarity: 'rare',      weight: 20 },
  { xp: 50,  label: 'Treasure Chest',   rarity: 'epic',      weight: 8  },
  { xp: 100, label: 'JACKPOT',          rarity: 'legendary', weight: 2  },
] as const;

const TOTAL_WEIGHT = PRIZES.reduce((sum, p) => sum + p.weight, 0);

function rollPrize() {
  let roll = Math.floor(Math.random() * TOTAL_WEIGHT);
  for (const prize of PRIZES) {
    roll -= prize.weight;
    if (roll < 0) return prize;
  }
  return PRIZES[0];
}

function getPacificDate(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

function getNextPacificMidnightUTC(): string {
  const now = new Date();
  const todayPacific = getPacificDate(now);
  const [y, m, d] = todayPacific.split('-').map(Number);
  const mm = String(m).padStart(2, '0');
  const dd = String(d + 1).padStart(2, '0');
  // Try PDT (-07:00) then PST (-08:00) — validate by re-parsing
  for (const offset of ['-07:00', '-08:00']) {
    const candidate = new Date(`${y}-${mm}-${dd}T00:00:00${offset}`);
    if (getPacificDate(candidate) === `${y}-${mm}-${dd}`) {
      return candidate.toISOString();
    }
  }
  return new Date(`${y}-${mm}-${dd}T08:00:00Z`).toISOString();
}

async function getPlayerId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('players')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();
  return data?.id ?? null;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const playerId = await getPlayerId(userId);
    if (!playerId) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    const todayPacific = getPacificDate(new Date());

    const { data: existingSpin } = await supabaseAdmin
      .from('daily_spins')
      .select('id')
      .eq('player_id', playerId)
      .eq('spin_date', todayPacific)
      .limit(1);

    const hasSpunToday = !!(existingSpin && existingSpin.length > 0);

    return NextResponse.json({
      canSpin: !hasSpunToday,
      nextSpinAt: hasSpunToday ? getNextPacificMidnightUTC() : null,
    });
  } catch (err) {
    console.error('daily-spin GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(_request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const playerId = await getPlayerId(userId);
    if (!playerId) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    const todayPacific = getPacificDate(new Date());

    // Race-condition guard — check before inserting
    const { data: existingSpin } = await supabaseAdmin
      .from('daily_spins')
      .select('id')
      .eq('player_id', playerId)
      .eq('spin_date', todayPacific)
      .limit(1);

    if (existingSpin && existingSpin.length > 0) {
      return NextResponse.json(
        { error: 'Already spun today', alreadySpun: true, nextSpinAt: getNextPacificMidnightUTC() },
        { status: 400 }
      );
    }

    const prize = rollPrize();

    // Record spin in daily_spins
    const { error: spinError } = await supabaseAdmin
      .from('daily_spins')
      .insert({
        player_id: playerId,
        result_xp: prize.xp,
        result_rarity: prize.rarity,
        result_description: prize.label,
        spin_date: todayPacific,
      });

    if (spinError) {
      console.error('daily_spins insert error:', spinError);
      return NextResponse.json({ error: 'Failed to record spin' }, { status: 500 });
    }

    // Award XP in ledger
    const { error: ledgerError } = await supabaseAdmin
      .from('xp_ledger')
      .insert({
        player_id: playerId,
        base_xp: prize.xp,
        multiplier: 1,
        final_xp: prize.xp,
        source: 'daily_spin',
        description: `Daily spin: ${prize.label}`,
      });

    if (ledgerError) {
      console.error('xp_ledger insert error:', ledgerError);
      return NextResponse.json({ error: 'Failed to award XP' }, { status: 500 });
    }

    // Compute new total XP
    const { data: totals } = await supabaseAdmin
      .from('xp_ledger')
      .select('final_xp')
      .eq('player_id', playerId);

    const newTotalXp = totals?.reduce((sum, row) => sum + (row.final_xp ?? 0), 0) ?? 0;

    return NextResponse.json({
      success: true,
      prize: { xp: prize.xp, label: prize.label, rarity: prize.rarity },
      newTotalXp,
      nextSpinAt: getNextPacificMidnightUTC(),
    });
  } catch (err) {
    console.error('daily-spin POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
