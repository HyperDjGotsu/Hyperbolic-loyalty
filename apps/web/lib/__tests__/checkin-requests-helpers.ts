// Shared test fixtures for the pending check-in request routes: a tiny in-memory stand-in for supabaseAdmin.
// It implements only what the routes use, including the two SQL functions (expiry and award evidence), so route logic can be tested
// without a database. The SQL functions themselves are tested against real Postgres in the migration test.
export type Row = Record<string, any>;

export function makeDb() {
  const state = {
    tables: {} as Record<string, Row[]>,
    writes: [] as string[],          // "table:op" for every write, so tests can prove what was (not) touched
    hideExistingOnce: false,         // simulate losing an insert race: the first "does it exist?" read sees nothing
    evidenceError: false,            // make the award-evidence function fail
    evidenceOverride: null as null | ((event: string, player: string) => Row | null),
    nextId: 1,
    reset: (_t: Record<string, Row[]>) => {},
    uuid: () => '',
  };
  const uuid = () => `00000000-0000-4000-8000-${String(state.nextId++).padStart(12, '0')}`;
  state.uuid = uuid;
  state.reset = (t) => { state.tables = t; state.writes = []; state.hideExistingOnce = false; state.evidenceError = false; state.evidenceOverride = null; state.nextId = 1000; };

  function builder(table: string) {
    const f: { eq: [string, any][]; in: [string, any[]][]; order?: [string, boolean]; op: string; patch?: Row; ins?: Row; ret?: boolean; count?: boolean } = { eq: [], in: [], op: 'select' };
    const rows = () => {
      let r = (state.tables[table] ?? []).filter(x => f.eq.every(([c, v]) => x[c] === v) && f.in.every(([c, vs]) => vs.includes(x[c])));
      if (f.order) r = [...r].sort((a, b) => (a[f.order![0]] < b[f.order![0]] ? -1 : 1) * (f.order![1] ? 1 : -1));
      return r;
    };
    const run = (): any => {
      if (f.op === 'insert') {
        state.writes.push(`${table}:insert`);
        const list = (state.tables[table] ??= []);
        if (table === 'checkin_requests' && list.some(x => x.event_id === f.ins!.event_id && x.player_id === f.ins!.player_id)) return { error: { code: '23505', message: 'duplicate' } };
        list.push({ id: uuid(), status: 'pending', attempts: 0, last_error: null, resolution: null, reopened_count: 0, requested_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...f.ins });
        return { error: null };
      }
      if (f.op === 'update') {
        state.writes.push(`${table}:update`);
        const hit = rows();
        hit.forEach(x => Object.assign(x, f.patch));
        return { data: f.ret ? hit.map(x => ({ id: x.id })) : null, error: null };
      }
      if (f.count) return { count: rows().length, data: null, error: null };
      return { data: rows(), error: null };
    };
    const b: any = {
      select: (_c?: string, o?: { count?: string }) => { if (f.op === 'update') f.ret = true; if (o?.count) f.count = true; return b; },
      eq: (c: string, v: any) => { f.eq.push([c, v]); return b; },
      in: (c: string, vs: any[]) => { f.in.push([c, vs]); return b; },
      order: (c: string, o?: { ascending?: boolean }) => { f.order = [c, o?.ascending !== false]; return b; },
      insert: (ins: Row) => { f.op = 'insert'; f.ins = ins; return b; },
      update: (patch: Row) => { f.op = 'update'; f.patch = patch; return b; },
      maybeSingle: async () => {
        if (table === 'checkin_requests' && state.hideExistingOnce) { state.hideExistingOnce = false; return { data: null, error: null }; }
        return { data: rows()[0] ?? null, error: null };
      },
      then: (res: any, rej: any) => Promise.resolve(run()).then(res, rej),
    };
    return b;
  }

  const client = {
    from: (t: string) => builder(t),
    rpc: async (name: string, args: Row) => {
      if (name === 'expire_checkin_requests') {
        state.writes.push('rpc:expire');
        for (const r of state.tables.checkin_requests ?? []) {
          const ev = (state.tables.events ?? []).find(e => e.id === r.event_id);
          if ((args?.p_event == null || args.p_event === r.event_id) && r.status === 'pending' && ev && ev.status !== 'active') Object.assign(r, { status: 'expired', resolution: 'event_ended' });
        }
        return { data: 0, error: null };
      }
      if (name === 'checkin_award_evidence') {
        if (state.evidenceError) return { data: null, error: { message: 'boom' } };
        if (state.evidenceOverride) { const o = state.evidenceOverride(args.p_event, args.p_player); if (o) return { data: o, error: null }; }
        const t = state.tables;
        const ev = (t.events ?? []).find(e => e.id === args.p_event);
        const pl = (t.players ?? []).find(p => p.id === args.p_player);
        return {
          data: {
            attendance_rows: (t.event_attendances ?? []).filter(a => a.event_id === args.p_event && a.player_id === args.p_player).length,
            xp_rows: (t.xp_ledger ?? []).filter(x => x.event_id === args.p_event && x.player_id === args.p_player && x.source === 'event_attendance').length,
            points_rows: (t.prize_point_transactions ?? []).filter(x => x.reference_id === args.p_event && x.player_id === args.p_player && x.source === 'event_checkin' && x.type === 'earn').length,
            points_expected: !!(ev && pl && (ev.store_id ?? pl.home_store_id)),
          },
          error: null,
        };
      }
      return { data: null, error: { message: `unknown rpc ${name}` } };
    },
  };
  return { state, client };
}

// One shared instance for the test file and the mocked supabase module (the module cache makes both imports the same object).
export const db = makeDb();
