'use client';

import { useState, useMemo } from "react";

const TIERS = [
  { id: "bronze", name: "Bronze", color: "#CD7F32", bg: "#2A1F12", border: "#CD7F32", monthlyFee: 10, multiplier: 1.0, label: "1x XP" },
  { id: "silver", name: "Silver", color: "#C0C0C0", bg: "#1A1A1F", border: "#C0C0C0", monthlyFee: 15, multiplier: 1.5, label: "1.5x XP" },
  { id: "gold",   name: "Gold",   color: "#FFD700", bg: "#1F1A00", border: "#FFD700", monthlyFee: 20, multiplier: 2.0, label: "2x XP" },
  { id: "diamond", name: "Diamond", color: "#22D3EE", bg: "#06222B", border: "#22D3EE", monthlyFee: 30, multiplier: 2.0, label: "2x XP + $15 credit" },
];

const BASE_XP = {
  attendance: 30,
  win1: 5, win2: 10, win3: 15, win4: 20,
  undefeated: 5,
  referralReceived: 30,
  referralGiven: 50,
  firstTimer: 25,
  returner: 25,
  signedUp: 50,
  taughtPlayer: 20,
  dailySpin: 11.6, // expected value of weighted spin (Bronze→Jackpot)
};

// Pack payout models. Packs a player earns for their total wins in one event.
const PAYOUTS = [
  { id: "one", label: "1 pack / win", packs: (w: number) => w },
  { id: "two", label: "2 packs / win", packs: (w: number) => w * 2 },
  { id: "135", label: "1-3-5", packs: (w: number) => (w <= 0 ? 0 : 2 * w - 1) },
] as const;

// Expected packs handed out in one event. Assumes a Swiss-style spread: a player wins k of r rounds
// with probability C(r,k) / 2^r, so it works for any player count and round count.
function expectedPacks(payoutId: string, players: number, rounds: number) {
  const payout = PAYOUTS.find((x) => x.id === payoutId) ?? PAYOUTS[0];
  let perPlayer = 0;
  let choose = 1;
  for (let k = 0; k <= rounds; k++) {
    perPlayer += (choose / 2 ** rounds) * payout.packs(k);
    choose = (choose * (rounds - k)) / (k + 1);
  }
  return perPlayer * players;
}

const CARD = "rounded-xl border border-border-token bg-surface p-5 sm:p-6";
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary";

function Slider({ label, value, min, max, step = 1, onChange, format = (v: number) => String(v), hint }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; format?: (v: number) => string; hint?: string;
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label className="text-sm text-secondary">{label}</label>
        <span className="whitespace-nowrap text-base font-bold tabular-nums text-primary">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-[var(--accent)]" />
      {hint && <div className="mt-1.5 text-xs text-tertiary">{hint}</div>}
    </div>
  );
}

function Stat({ label, value, sub, valueClass = "text-accent" }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="min-w-[140px] flex-1 rounded-lg border border-border-token bg-elevated p-4">
      <div className={EYEBROW}>{label}</div>
      <div className={`mt-1.5 text-2xl font-extrabold tabular-nums leading-none ${valueClass}`}>{value}</div>
      {sub && <div className="mt-1.5 text-xs text-tertiary">{sub}</div>}
    </div>
  );
}

function Row({ label, value, valueClass = "text-primary", strong = false }: { label: string; value: string; valueClass?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className={strong ? "font-semibold text-primary" : "text-secondary"}>{label}</span>
      <span className={`whitespace-nowrap font-bold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

function UnlockThresholdTab() {
  const [retailPrice, setRetailPrice] = useState(300);
  const [costToStore, setCostToStore] = useState(80);
  const [subFee, setSubFee] = useState(10);
  const [buffer, setBuffer] = useState(20);

  const margin = retailPrice > 0 ? Math.round(((retailPrice - costToStore) / retailPrice) * 100) : 0;
  const rawThreshold = retailPrice / subFee;
  const threshold = Math.ceil(rawThreshold * (1 + buffer / 100));
  const revenueAtUnlock = threshold * subFee;
  const profitAtUnlock = revenueAtUnlock - costToStore;

  const ladderItems = [
    { name: "Promo Pack",       retail: 5,              cost: 1 },
    { name: "Booster Pack",     retail: 10,             cost: 4 },
    { name: "3-Pack Bundle",    retail: 30,             cost: 12 },
    { name: "Booster Box (custom)", retail: retailPrice, cost: costToStore },
    { name: "Sealed Case (est.)",   retail: retailPrice * 6, cost: costToStore * 6 },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-5">
        <div className={CARD}>
          <div className={`${EYEBROW} mb-5`}>Prize Settings</div>

          <Slider label="Your retail price" value={retailPrice} min={10} max={600} step={5} onChange={setRetailPrice}
            format={(v) => `$${v}`} hint="What you charge customers for this item" />
          <Slider label="Your cost to store" value={costToStore} min={1} max={600} step={1} onChange={setCostToStore}
            format={(v) => `$${v}`} hint="What you actually paid for it, not an assumption" />
          <Slider label="Monthly sub fee" value={subFee} min={5} max={30} step={5} onChange={setSubFee}
            format={(v) => `$${v}/mo`} hint="Tier doesn't matter, every sub counts as 1" />
          <Slider label="Safety buffer" value={buffer} min={0} max={50} step={5} onChange={setBuffer}
            format={(v) => `${v}%`} hint="Extra subscribers above break-even before unlocking" />

          <div className="mt-2 rounded-lg bg-elevated p-4">
            <div className="mb-2 text-xs font-semibold text-tertiary">Item P&amp;L</div>
            <Row label="Retail price" value={`$${retailPrice}`} />
            <Row label="Cost to store" value={`-$${costToStore}`} valueClass="text-danger" />
            <div className="mt-1 border-t border-border-token pt-1">
              <Row label="Gross margin if sold" value={`${margin}% ($${retailPrice - costToStore})`} valueClass={margin >= 0 ? "text-success" : "text-danger"} strong />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex-1 rounded-xl border-2 border-accent bg-surface p-5 sm:p-6">
            <div className={`${EYEBROW} mb-3`}>Unlock Threshold</div>
            <div className="font-display text-6xl font-extrabold leading-none text-accent">
              {threshold}<span className="font-sans text-lg font-normal text-tertiary"> subs</span>
            </div>
            <div className="mt-2 text-xs text-secondary">{Math.ceil(rawThreshold)} minimum + {buffer}% buffer</div>
            <div className="mt-1 text-xs text-tertiary">Based on retail price (${retailPrice}) ÷ ${subFee}/mo sub fee</div>
          </div>
          <div className="flex gap-3">
            <Stat label="Revenue at unlock" value={`$${revenueAtUnlock}`} valueClass="text-success" />
            <Stat label="Profit before claim" value={`$${profitAtUnlock}`} valueClass="text-success" />
          </div>
          <div className={CARD}>
            <div className={`${EYEBROW} mb-3`}>Prize Wall vs Selling It</div>
            <div className="flex gap-3 text-center">
              <div className="flex-1 rounded-lg bg-elevated p-3">
                <div className="text-xs text-tertiary">Sell outright</div>
                <div className="mt-1 text-lg font-bold tabular-nums text-secondary">${retailPrice - costToStore}</div>
                <div className="text-[11px] text-tertiary">one transaction</div>
              </div>
              <div className="flex-1 rounded-lg border border-success/40 bg-success/10 p-3">
                <div className="text-xs text-tertiary">Prize wall</div>
                <div className="mt-1 text-lg font-bold tabular-nums text-success">${profitAtUnlock}</div>
                <div className="text-[11px] text-tertiary">before claimed</div>
              </div>
            </div>
            <div className={`mt-3 text-center text-sm font-bold ${profitAtUnlock > (retailPrice - costToStore) ? "text-success" : "text-danger"}`}>
              {profitAtUnlock > (retailPrice - costToStore)
                ? `+$${profitAtUnlock - (retailPrice - costToStore)} advantage from prize wall`
                : `Selling outright nets more. Lower your buffer or raise sub fee`}
            </div>
          </div>
        </div>
      </div>

      <div className={CARD}>
        <div className={`${EYEBROW} mb-4`}>Prize Ladder · Unlock Thresholds at ${subFee}/mo</div>
        <div className="flex flex-col gap-2">
          {ladderItems.map((p, i) => {
            const thresh = Math.ceil((p.retail / subFee) * (1 + buffer / 100));
            const rev = thresh * subFee;
            const isHighlight = p.retail === retailPrice && p.cost === costToStore;
            return (
              <div key={i} className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border p-3 ${isHighlight ? "border-accent/50 bg-accent/10" : "border-border-token bg-elevated"}`}>
                <div className={`min-w-[160px] flex-[2] text-sm ${isHighlight ? "font-bold text-primary" : "text-secondary"}`}>
                  {p.name}<span className="text-xs font-normal text-tertiary"> · ${p.retail} retail</span>
                </div>
                <div className="flex-1 text-sm text-tertiary">Cost <span className="tabular-nums text-secondary">${p.cost}</span></div>
                <div className="flex-1 text-center text-sm font-bold tabular-nums text-accent">{thresh} subs</div>
                <div className="flex-1 text-right text-xs tabular-nums text-tertiary">${rev} revenue</div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-xs leading-relaxed text-tertiary">
          Booster Box row uses your actual cost inputs. Other rows use estimated costs, update them as needed.
        </div>
      </div>
    </div>
  );
}

export default function LoyaltyCalculator() {
  const [tab, setTab] = useState("economics");
  const [selectedTier, setSelectedTier] = useState("bronze");
  const [eventsPerWeek, setEventsPerWeek] = useState(1);
  const [avgWins, setAvgWins] = useState(2);
  const [goesUndefeated, setGoesUndefeated] = useState(false);
  const [referralsPerMonth, setReferralsPerMonth] = useState(0);
  const [taughtPerMonth, setTaughtPerMonth] = useState(0);
  const [prizeValue, setPrizeValue] = useState(300);
  const [prizeCostActual, setPrizeCostActual] = useState(80);
  const [totalSubscribers, setTotalSubscribers] = useState(30);
  const [entryFee, setEntryFee] = useState(15);
  const [packCost, setPackCost] = useState(4);
  const [rounds, setRounds] = useState(3);
  const [playersPerEvent, setPlayersPerEvent] = useState(10);
  const [creditUsePct, setCreditUsePct] = useState(100);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [payoutId, setPayoutId] = useState("one");

  const tier = TIERS.find((t) => t.id === selectedTier) || TIERS[0];

  const calc = useMemo(() => {
    let xpPerEvent = BASE_XP.attendance;
    const winXp = [0, BASE_XP.win1, BASE_XP.win2, BASE_XP.win3, BASE_XP.win4];
    xpPerEvent += winXp[Math.min(avgWins, 4)] || 0;
    if (goesUndefeated) xpPerEvent += BASE_XP.undefeated;

    const eventsPerMonth = eventsPerWeek * 4.33;
    const monthlyEventXP = xpPerEvent * eventsPerMonth;
    const monthlyReferralXP = referralsPerMonth * BASE_XP.referralGiven;
    const monthlyTaughtXP = taughtPerMonth * BASE_XP.taughtPlayer;
    const dailySpinXP = BASE_XP.dailySpin * 30;

    const totalMonthlyBaseXP = monthlyEventXP + monthlyReferralXP + monthlyTaughtXP + dailySpinXP;
    const totalMonthlyXP = totalMonthlyBaseXP * tier.multiplier;

    const prizeCost = Math.round(prizeValue / 0.30);
    const monthsToRedeem = prizeCost / totalMonthlyXP;

    const totalPacksPerEvent = expectedPacks(payoutId, playersPerEvent, rounds);
    const prizingCostPerEvent = totalPacksPerEvent * packCost;
    const grossEntryPerEvent = playersPerEvent * entryFee;
    const netEventRevenue = grossEntryPerEvent - prizingCostPerEvent;

    const totalEvents = eventsPerWeek * 4.33 * monthsToRedeem;
    const entryFeeRevenue = Math.round(totalEvents * netEventRevenue);
    const subRevenuePerRedeemer = tier.monthlyFee * monthsToRedeem;
    const otherSubscribers = totalSubscribers - 1;
    const crowdPoolRevenue = otherSubscribers * tier.monthlyFee * monthsToRedeem;
    // Diamond only: every subscriber can take $15 off an event entry once a month, which is revenue we give up
    const creditCost = tier.id === "diamond" ? totalSubscribers * 15 * monthsToRedeem * (creditUsePct / 100) : 0;
    const totalRevenue = subRevenuePerRedeemer + entryFeeRevenue + crowdPoolRevenue - creditCost;
    const prizeCostToStore = prizeCostActual;
    const trueNet = totalRevenue - prizeCostToStore;

    return {
      xpPerEvent: Math.round(xpPerEvent),
      eventsPerMonth: Math.round(eventsPerMonth * 10) / 10,
      monthlyXP: Math.round(totalMonthlyXP),
      prizeCost,
      monthsToRedeem: Math.round(monthsToRedeem * 10) / 10,
      subRevenuePerRedeemer: Math.round(subRevenuePerRedeemer),
      entryFeeRevenue,
      crowdPoolRevenue: Math.round(crowdPoolRevenue),
      creditCost: Math.round(creditCost),
      totalRevenue: Math.round(totalRevenue),
      trueNet: Math.round(trueNet),
      prizeCostToStore: Math.round(prizeCostToStore),
      totalPacksPerEvent,
      prizingCostPerEvent: Math.round(prizingCostPerEvent),
      grossEntryPerEvent,
      netEventRevenue: Math.round(netEventRevenue),
      prizeMargin: prizeValue > 0 ? Math.round(((prizeValue - prizeCostActual) / prizeValue) * 100) : 0,
    };
  }, [selectedTier, eventsPerWeek, avgWins, goesUndefeated, referralsPerMonth, taughtPerMonth, prizeValue, prizeCostActual, totalSubscribers, entryFee, packCost, rounds, playersPerEvent, creditUsePct, payoutId, tier]);

  const fmt = (n: number) => `$${n.toLocaleString()}`;
  const fmtXP = (n: number) => `${n.toLocaleString()} XP`;

  return (
    <div className="min-h-screen bg-base px-4 py-8 text-primary">
      <div className="mx-auto max-w-[1100px]">

        <div className="mb-8">
          <a href="/hq" className="mb-4 inline-block text-sm text-secondary hover:text-primary">← HQ</a>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">Player Pass · Internal</div>
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">Prize Wall Economics</h1>
          <p className="mt-2 text-sm text-secondary">Model the revenue generated before a single prize walks out the door.</p>
        </div>

        <div className="mb-7 flex flex-wrap gap-1">
          {[{ id: "economics", label: "Prize Wall Economics" }, { id: "unlock", label: "Unlock Thresholds" }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id ? "border border-accent/30 bg-accent/10 text-accent" : "border border-transparent text-secondary hover:bg-elevated hover:text-primary"
              }`}>{t.label}</button>
          ))}
        </div>

        {tab === "unlock" && <UnlockThresholdTab />}

        {tab === "economics" && <>
          <div className="mb-7">
            <div className={`${EYEBROW} mb-3`}>Membership Tier</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TIERS.map((t) => (
                <button key={t.id} onClick={() => setSelectedTier(t.id)}
                  style={selectedTier === t.id ? { borderColor: t.color } : undefined}
                  className={`rounded-xl border-2 p-4 text-left transition-colors ${selectedTier === t.id ? "bg-elevated" : "border-border-token bg-surface hover:bg-elevated"}`}>
                  <div className="text-base font-extrabold" style={{ color: t.color }}>{t.name}</div>
                  <div className="mt-0.5 text-xl font-bold tabular-nums text-primary">${t.monthlyFee}<span className="text-xs font-normal text-tertiary">/mo</span></div>
                  <div className="mt-0.5 text-xs text-tertiary">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-6">
            <div className={`${CARD} self-start`}>
              <div className={`${EYEBROW} mb-5`}>Prize &amp; Program</div>

              <Slider label="Prize wall item retail price" value={prizeValue} min={10} max={500} step={10} onChange={setPrizeValue}
                format={(v) => `$${v}`} hint="What you charge customers for this item" />
              <Slider label="Your cost to store" value={prizeCostActual} min={1} max={500} step={1} onChange={setPrizeCostActual}
                format={(v) => `$${v}`} hint={`Actual cost, not an assumption. Margin: ${calc.prizeMargin}%`} />
              <Slider label="Total subscribers" value={totalSubscribers} min={5} max={200} step={5} onChange={setTotalSubscribers}
                format={(v) => `${v} members`} hint="Total paying subscribers across the program" />

              <button onClick={() => setShowAdvanced(v => !v)}
                className="w-full rounded-lg border border-border-strong bg-elevated px-4 py-2.5 text-left text-sm font-semibold text-secondary hover:text-primary">
                {showAdvanced ? "Hide" : "Show"} advanced assumptions {showAdvanced ? "▴" : "▾"}
              </button>
              <div className="mt-1.5 text-xs text-tertiary">Defaults are fine for a quick answer. Open this to change how often players attend, event size and entry fee.</div>

              {showAdvanced && (
                <div className="mt-6">
                  <div className={`${EYEBROW} mb-5`}>Player Profile</div>

                  <Slider label="Events per week" value={eventsPerWeek} min={1} max={7} onChange={setEventsPerWeek} hint="How often does a typical subscriber attend?" />
                  <Slider label="Average wins per event" value={avgWins} min={0} max={4} onChange={setAvgWins} hint="0–4 wins. Affects XP earned per event." />

                  <label className="mb-5 flex cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={goesUndefeated} onChange={(e) => setGoesUndefeated(e.target.checked)}
                      className="h-4 w-4 accent-[var(--accent)]" />
                    <span className="text-sm text-secondary">Goes undefeated (+5 XP bonus)</span>
                  </label>

                  <Slider label="Referrals brought per month" value={referralsPerMonth} min={0} max={5} onChange={setReferralsPerMonth}
                    format={(v) => `${v} player${v !== 1 ? "s" : ""}`} hint="+50 XP per referral who attends first event" />
                  <Slider label="Players taught per month" value={taughtPerMonth} min={0} max={5} onChange={setTaughtPerMonth}
                    format={(v) => `${v} player${v !== 1 ? "s" : ""}`} hint="+20 XP per player taught" />

                  <div className="mt-1 border-t border-border-token pt-5">
                    <div className={`${EYEBROW} mb-5`}>Event Settings</div>

                    <Slider label="Event entry fee" value={entryFee} min={0} max={30} step={1} onChange={setEntryFee}
                      format={(v) => `$${v}`} hint="What players pay to enter each event" />
                    <Slider label="Players per event" value={playersPerEvent} min={4} max={32} step={1} onChange={setPlayersPerEvent}
                      format={(v) => `${v} players`} hint="Drives how many packs get handed out" />
                    <Slider label="Rounds per event" value={rounds} min={1} max={6} step={1} onChange={setRounds}
                      format={(v) => `${v} rounds`} hint="Number of rounds in a typical event" />
                    {tier.id === "diamond" && (
                      <Slider label="Event Credit used" value={creditUsePct} min={0} max={100} step={10} onChange={setCreditUsePct}
                        format={(v) => `${v}%`} hint="Share of Diamond subscribers who use their $15 credit each month" />
                    )}
                    <div className="mb-5">
                      <div className="mb-2 text-sm text-secondary">Pack payout</div>
                      <div className="grid grid-cols-3 gap-2">
                        {PAYOUTS.map((o) => (
                          <button key={o.id} onClick={() => setPayoutId(o.id)}
                            className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                              payoutId === o.id ? "border-accent/40 bg-accent/10 text-accent" : "border-border-strong bg-elevated text-secondary hover:text-primary"
                            }`}>{o.label}</button>
                        ))}
                      </div>
                      <div className="mt-1.5 text-xs text-tertiary">1-3-5 pays 1 pack for 1 win, 3 for 2 wins, 5 for 3 wins (then +2 each extra win).</div>
                    </div>
                    <Slider label="Pack cost to store" value={packCost} min={1} max={20} step={1} onChange={setPackCost}
                      format={(v) => `$${v}`} hint="Your cost per pack used for pack-per-win prizing" />

                    <div className="mt-2 rounded-lg bg-elevated p-4">
                      <div className="mb-2 text-xs font-semibold text-tertiary">Event P&amp;L Preview</div>
                      <Row label={`Gross entry (${playersPerEvent} × $${entryFee})`} value={`$${calc.grossEntryPerEvent}`} />
                      <Row label={`Prizing cost (~${Math.round(calc.totalPacksPerEvent)} packs × $${packCost})`} value={`-$${calc.prizingCostPerEvent}`} valueClass="text-danger" />
                      <div className="mt-1 border-t border-border-token pt-1">
                        <Row label="Net per event" value={`$${calc.netEventRevenue}`} valueClass={calc.netEventRevenue >= 0 ? "text-success" : "text-danger"} strong />
                      </div>
                      <div className="mt-3 border-t border-border-token pt-2 text-xs text-tertiary">
                        {PAYOUTS.map((o) => {
                          const packs = expectedPacks(o.id, playersPerEvent, rounds);
                          const net = Math.round(calc.grossEntryPerEvent - packs * packCost);
                          return (
                            <div key={o.id} className="flex justify-between py-0.5">
                              <span>{o.label}: ~{Math.round(packs)} packs</span>
                              <span className={`tabular-nums ${net >= 0 ? "text-secondary" : "text-danger"}`}>net ${net}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className={CARD}>
                <div className={`${EYEBROW} mb-4`}>XP Earn Rate</div>
                <div className="flex flex-wrap gap-3">
                  <Stat label="Per Event" value={fmtXP(calc.xpPerEvent)} />
                  <Stat label="Per Month" value={fmtXP(calc.monthlyXP)} sub={`${tier.multiplier}x multiplier applied`} />
                </div>
                <div className="mt-3 rounded-lg bg-elevated px-4 py-2.5 text-sm text-secondary">
                  Prize wall cost: <span className="font-bold tabular-nums text-primary">{fmtXP(calc.prizeCost)}</span>
                  <span className="text-tertiary"> (${prizeValue} ÷ 0.30)</span>
                </div>
              </div>

              <div className="rounded-xl border-2 bg-surface p-5 sm:p-6" style={{ borderColor: tier.color }}>
                <div className={`${EYEBROW} mb-3`}>Time to Redeem</div>
                <div className="font-display text-5xl font-extrabold leading-none" style={{ color: tier.color }}>
                  {calc.monthsToRedeem}<span className="font-sans text-lg font-normal text-tertiary"> months</span>
                </div>
                <div className="mt-2 text-xs text-secondary">
                  ~{Math.round(calc.eventsPerMonth * calc.monthsToRedeem)} total events attended
                </div>
              </div>

              <div className={CARD}>
                <div className={`${EYEBROW} mb-3`}>Revenue Before Prize Is Claimed</div>
                <div className="divide-y divide-border-token">
                  {[
                    { label: `Redeemer's sub fees (${calc.monthsToRedeem} mo × ${fmt(tier.monthlyFee)})`, value: calc.subRevenuePerRedeemer, cls: "text-accent" },
                    { label: `Net event revenue (~${Math.round(calc.eventsPerMonth * calc.monthsToRedeem)} events × $${calc.netEventRevenue} net)`, value: calc.entryFeeRevenue, cls: "text-accent" },
                    { label: `Crowd pool (${totalSubscribers - 1} other subs × ${fmt(tier.monthlyFee)} × ${calc.monthsToRedeem} mo)`, value: calc.crowdPoolRevenue, cls: "text-warning" },
                    ...(tier.id === "diamond"
                      ? [{ label: `Event Credits given (${totalSubscribers} subs × $15 × ${calc.monthsToRedeem} mo × ${creditUsePct}% used)`, value: -calc.creditCost, cls: "text-danger" }]
                      : []),
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0 text-xs text-secondary">{row.label}</span>
                      <span className={`whitespace-nowrap text-sm font-bold tabular-nums ${row.cls}`}>{row.value < 0 ? `-${fmt(-row.value)}` : fmt(row.value)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-lg bg-elevated px-4 py-3">
                  <span className="text-sm font-semibold text-primary">Total Revenue</span>
                  <span className="text-2xl font-extrabold tabular-nums text-success">{fmt(calc.totalRevenue)}</span>
                </div>
              </div>

              <div className={CARD}>
                <div className={`${EYEBROW} mb-3`}>Prize Wall vs. Just Selling It</div>
                <div className="flex gap-3">
                  <div className="flex-1 rounded-lg bg-elevated p-4">
                    <div className="text-xs text-tertiary">Sell it outright</div>
                    <div className="mt-1 text-xl font-bold tabular-nums text-secondary">{fmt(prizeValue)}</div>
                    <div className="mt-0.5 text-[11px] text-tertiary">one transaction, done</div>
                  </div>
                  <div className="flex-1 rounded-lg border border-success/40 bg-success/10 p-4">
                    <div className="text-xs text-tertiary">Put it on prize wall</div>
                    <div className="mt-1 text-xl font-bold tabular-nums text-success">{fmt(calc.totalRevenue)}</div>
                    <div className="mt-0.5 text-[11px] text-tertiary">generated before claimed</div>
                  </div>
                </div>
                <div className={`mt-3 rounded-lg border p-3 text-center ${calc.trueNet > 0 ? "border-success/40 bg-success/10" : "border-danger/40 bg-danger/10"}`}>
                  <span className="text-sm text-secondary">Net advantage of prize wall: </span>
                  <span className={`text-base font-extrabold tabular-nums ${calc.trueNet > 0 ? "text-success" : "text-danger"}`}>
                    {calc.trueNet > 0 ? "+" : ""}{fmt(calc.trueNet)}
                  </span>
                  <div className="mt-0.5 text-[11px] text-tertiary">after actual cost of prize (${calc.prizeCostToStore})</div>
                </div>
              </div>
            </div>
          </div>

          <div className={`${CARD} mt-6 text-sm leading-relaxed text-secondary`}>
            <span className="font-bold text-warning">The crowd pool ({fmt(calc.crowdPoolRevenue)}) </span>
            is revenue from subscribers who never redeem anything. They&apos;re funding the prize wall by paying in month after month while only the top earners ever claim a prize. The bigger the subscriber base, the more powerful this effect gets.
          </div>
        </>}
      </div>
    </div>
  );
}
