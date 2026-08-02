import { NextResponse } from 'next/server';
import { getStaffContext } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ctx = await getStaffContext();
    if (!ctx) return NextResponse.json({ isStaff: false });

    let stores: Array<{ id: string; name: string; role: string }> = [];

    if (ctx.isNetworkAdmin) {
      // Network admins see all active stores
      const { data } = await supabaseAdmin
        .from('stores')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (data) {
        stores = data.map(s => ({ id: s.id, name: s.name, role: 'network_admin' }));
      }
    } else if (ctx.allStoreIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('stores')
        .select('id, name')
        .in('id', ctx.allStoreIds)
        .order('name');

      if (data) {
        stores = data.map(s => ({
          id: s.id,
          name: s.name,
          role: ctx.managedStoreIds.includes(s.id) ? 'store_manager' : 'store_staff',
        }));
      }
    }

    return NextResponse.json({
      isStaff: true,
      isNetworkAdmin: ctx.isNetworkAdmin,
      stores,
      primaryStoreId: stores[0]?.id ?? null,
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ isStaff: false });
  }
}
