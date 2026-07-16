import { NextResponse } from 'next/server';
import { requireAnyStaff } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const staffCtx = await requireAnyStaff();
    return NextResponse.json({ isStaff: staffCtx !== null });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ isStaff: false });
  }
}
