import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export type StaffContext = {
  appUserId: string;
  clerkUserId: string;
  isNetworkAdmin: boolean;
  managedStoreIds: string[];
  staffStoreIds: string[];
  allStoreIds: string[];
};

// Core lookup — resolves Clerk userId to full staff context.
// Returns null if the user has no app_users record or no staff roles.
export async function getStaffContext(): Promise<StaffContext | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const { data, error } = await supabaseAdmin
    .from('app_users')
    .select(`
      id,
      network_staff_roles!network_staff_roles_user_id_fkey ( role ),
      staff_store_roles!staff_store_roles_user_id_fkey ( store_id, role )
    `)
    .eq('clerk_user_id', userId)
    .single();

  if (error || !data) return null;

  const networkRoles = (data.network_staff_roles ?? []) as { role: string }[];
  const storeRoles = (data.staff_store_roles ?? []) as { store_id: string; role: string }[];

  const isNetworkAdmin = networkRoles.some(r => r.role === 'network_admin');
  const managedStoreIds = storeRoles
    .filter(r => r.role === 'store_manager')
    .map(r => r.store_id);
  const staffStoreIds = storeRoles
    .filter(r => r.role === 'store_staff')
    .map(r => r.store_id);
  const allStoreIds = storeRoles.map(r => r.store_id);

  // Must have at least one role to be considered staff
  if (!isNetworkAdmin && allStoreIds.length === 0) return null;

  return {
    appUserId: data.id,
    clerkUserId: userId,
    isNetworkAdmin,
    managedStoreIds,
    staffStoreIds,
    allStoreIds,
  };
}

// Requires network_admin role.
export async function requireNetworkAdmin(): Promise<StaffContext | null> {
  const ctx = await getStaffContext();
  return ctx?.isNetworkAdmin ? ctx : null;
}

// Requires any staff role (any store or network admin).
// Use this as a drop-in replacement for the old is_staff check.
export async function requireAnyStaff(): Promise<StaffContext | null> {
  return getStaffContext();
}

// Requires network_admin OR a role at the specified store.
export async function requireStoreAccess(storeId: string): Promise<StaffContext | null> {
  const ctx = await getStaffContext();
  if (!ctx) return null;
  if (ctx.isNetworkAdmin) return ctx;
  return ctx.allStoreIds.includes(storeId) ? ctx : null;
}

// Requires network_admin OR store_manager role at the specified store.
export async function requireStoreManager(storeId: string): Promise<StaffContext | null> {
  const ctx = await getStaffContext();
  if (!ctx) return null;
  if (ctx.isNetworkAdmin) return ctx;
  return ctx.managedStoreIds.includes(storeId) ? ctx : null;
}
