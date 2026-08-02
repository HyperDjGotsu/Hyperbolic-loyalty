'use client';

import { useState, useMemo } from "react";

const TIERS = [
  { id: "bronze", name: "Bronze", color: "#CD7F32", bg: "#2A1F12", border: "#CD7F32", monthlyFee: 10, multiplier: 1.0, label: "1x XP" },
  { id: "silver", name: "Silver", color: "#C0C0C0", bg: "#1A1A1F", border: "#C0C0C0", monthlyFee: 15, multiplier: 1.5, label: "1.5x XP" },
  { id: "gold",   name: "Gold",   color: "#FFD700", bg: "#1F1A00", border: "#FFD700", monthlyFee: 25, multiplier: 2.0, label: "2x XP" },
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

function StatCard({ label, value, sub, color = "#0D9488" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "Georgia, serif", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, onChange, format = (v: number) => String(v), hint }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; format?: (v: number) => string; hint?: string;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <label style={{ fontSize: 13, color: "#D1D5DB", fontFamily: "system-ui" }}>{label}</label>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#F9FAFB", fontFamily: "Georgia, serif" }}>{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#0D9488", cursor: "pointer" }} />
      {hint && <div style={{ fontSize: 11, color: "#4B5563", marginTop: 3 }}>{hint}</div>}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#111827", borderRadius: 14, padding: 24, border: "1px solid #1F2937" }}>
          <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 20 }}>Prize Settings</div>

          <Slider label="Your retail price" value={retailPrice} min={10} max={600} step={5} onChange={setRetailPrice}
            format={(v) => `$${v}`} hint="What you charge customers for this item" />
          <Slider label="Your cost to store" value={costToStore} min={1} max={600} step={1} onChange={setCostToStore}
            format={(v) => `$${v}`} hint="What you actually paid for it — not an assumption" />
          <Slider label="Monthly sub fee" value={subFee} min={5} max={30} step={5} onChange={setSubFee}
            format={(v) => `$${v}/mo`} hint="Tier doesn't matter — every sub counts as 1" />
          <Slider label="Safety buffer" value={buffer} min={0} max={50} step={5} onChange={setBuffer}
            format={(v) => `${v}%`} hint="Extra subscribers above break-even before unlocking" />

          <div style={{ marginTop: 8, padding: "12px 14px", background: "#0B0F1A", borderRadius: 8, fontSize: 12 }}>
            <div style={{ color: "#6B7280", marginBottom: 8, fontWeight: 600 }}>Item P&L</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "#6B7280" }}>Retail price</span><span style={{ color: "#F9FAFB" }}>${retailPrice}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "#6B7280" }}>Cost to store</span><span style={{ color: "#EF4444" }}>-${costToStore}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #1F2937", paddingTop: 6, marginTop: 4 }}>
              <span style={{ color: "#D1D5DB", fontWeight: 700 }}>Gross margin if sold</span>
              <span style={{ color: margin >= 0 ? "#10B981" : "#EF4444", fontWeight: 700 }}>{margin}% (${retailPrice - costToStore})</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#111827", borderRadius: 14, padding: 24, border: "2px solid #0D9488", flex: 1 }}>
            <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Unlock Threshold</div>
            <div style={{ fontSize: 64, fontWeight: 800, color: "#0D9488", fontFamily: "Georgia, serif", lineHeight: 1 }}>
              {threshold}<span style={{ fontSize: 18, color: "#6B7280", fontWeight: 400 }}> subs</span>
            </div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 8 }}>{Math.ceil(rawThreshold)} minimum + {buffer}% buffer</div>
            <div style={{ fontSize: 11, color: "#4B5563", marginTop: 6 }}>Based on retail price (${retailPrice}) ÷ ${subFee}/mo sub fee</div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, background: "#111827", borderRadius: 10, padding: "14px 16px", border: "1px solid #1F2937" }}>
              <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>Revenue at unlock</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#10B981", fontFamily: "Georgia, serif" }}>${revenueAtUnlock}</div>
            </div>
            <div style={{ flex: 1, background: "#0D2618", borderRadius: 10, padding: "14px 16px", border: "1px solid #10B981" }}>
              <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>Profit before claim</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#10B981", fontFamily: "Georgia, serif" }}>${profitAtUnlock}</div>
            </div>
          </div>
          <div style={{ background: "#0B0F1A", borderRadius: 10, padding: "14px 16px", border: "1px solid #1F2937" }}>
            <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 10, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase" }}>Prize Wall vs Selling It</div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>Sell outright</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#6B7280" }}>${retailPrice - costToStore}</div>
                <div style={{ fontSize: 10, color: "#4B5563" }}>one transaction</div>
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>Prize wall</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#10B981" }}>${profitAtUnlock}</div>
                <div style={{ fontSize: 10, color: "#4B5563" }}>before claimed</div>
              </div>
            </div>
            <div style={{ marginTop: 10, textAlign: "center", fontSize: 12, color: profitAtUnlock > (retailPrice - costToStore) ? "#10B981" : "#EF4444", fontWeight: 700 }}>
              {profitAtUnlock > (retailPrice - costToStore)
                ? `+$${profitAtUnlock - (retailPrice - costToStore)} advantage from prize wall`
                : `Selling outright nets more — lower your buffer or raise sub fee`}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "#111827", borderRadius: 14, padding: 24, border: "1px solid #1F2937" }}>
        <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>
          Prize Ladder — Unlock Thresholds at ${subFee}/mo
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ladderItems.map((p, i) => {
            const thresh = Math.ceil((p.retail / subFee) * (1 + buffer / 100));
            const rev = thresh * subFee;
            const isHighlight = p.retail === retailPrice && p.cost === costToStore;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, background: isHighlight ? "#0D2618" : "#0B0F1A", border: `1px solid ${isHighlight ? "#10B981" : "#1F2937"}` }}>
                <div style={{ flex: 2, fontSize: 13, color: isHighlight ? "#F9FAFB" : "#9CA3AF", fontWeight: isHighlight ? 700 : 400 }}>
                  {p.name}<span style={{ color: "#4B5563", fontWeight: 400, fontSize: 11 }}> · ${p.retail} retail</span>
                </div>
                <div style={{ flex: 1, fontSize: 13, color: "#6B7280" }}>Cost: <span style={{ color: "#9CA3AF" }}>${p.cost}</span></div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#0D9488", textAlign: "center" }}>{thresh} subs</div>
                <div style={{ flex: 1, fontSize: 12, color: "#6B7280", textAlign: "right" }}>${rev} revenue</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 14, fontSize: 12, color: "#4B5563", lineHeight: 1.6 }}>
          Booster Box row uses your actual cost inputs. Other rows use estimated costs — update them as needed.
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

    const packsPerRound = Math.ceil(playersPerEvent / 2);
    const totalPacksPerEvent = packsPerRound * rounds;
    const prizingCostPerEvent = totalPacksPerEvent * packCost;
    const grossEntryPerEvent = playersPerEvent * entryFee;
    const netEventRevenue = grossEntryPerEvent - prizingCostPerEvent;

    const totalEvents = eventsPerWeek * 4.33 * monthsToRedeem;
    const entryFeeRevenue = Math.round(totalEvents * netEventRevenue);
    const subRevenuePerRedeemer = tier.monthlyFee * monthsToRedeem;
    const otherSubscribers = totalSubscribers - 1;
    const crowdPoolRevenue = otherSubscribers * tier.monthlyFee * monthsToRedeem;
    const totalRevenue = subRevenuePerRedeemer + entryFeeRevenue + crowdPoolRevenue;
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
      totalRevenue: Math.round(totalRevenue),
      trueNet: Math.round(trueNet),
      prizeCostToStore: Math.round(prizeCostToStore),
      packsPerRound,
      totalPacksPerEvent,
      prizingCostPerEvent: Math.round(prizingCostPerEvent),
      grossEntryPerEvent,
      netEventRevenue: Math.round(netEventRevenue),
      prizeMargin: prizeValue > 0 ? Math.round(((prizeValue - prizeCostActual) / prizeValue) * 100) : 0,
    };
  }, [selectedTier, eventsPerWeek, avgWins, goesUndefeated, referralsPerMonth, taughtPerMonth, prizeValue, prizeCostActual, totalSubscribers, entryFee, packCost, rounds, playersPerEvent, tier]);

  const fmt = (n: number) => `$${n.toLocaleString()}`;
  const fmtXP = (n: number) => `${n.toLocaleString()} XP`;

  return (
    <div style={{ minHeight: "100vh", background: "#0B0F1A", color: "#F9FAFB", fontFamily: "system-ui, sans-serif", padding: "24px 16px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: "#0D9488", fontFamily: "monospace", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
            Games of · Loyalty Program
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, fontFamily: "Georgia, serif", lineHeight: 1.1 }}>
            Prize Wall Economics
          </h1>
          <p style={{ color: "#6B7280", marginTop: 8, fontSize: 14, margin: "8px 0 0" }}>
            Model the revenue generated before a single prize walks out the door.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {[{ id: "economics", label: "Prize Wall Economics" }, { id: "unlock", label: "Unlock Thresholds" }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: "system-ui", fontSize: 13, fontWeight: 600,
              background: tab === t.id ? "#0D9488" : "#111827",
              color: tab === t.id ? "#FFFFFF" : "#6B7280",
              transition: "all 0.15s",
            }}>{t.label}</button>
          ))}
        </div>

        {tab === "unlock" && <UnlockThresholdTab />}

        {tab === "economics" && <>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Membership Tier</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {TIERS.map((t) => (
                <button key={t.id} onClick={() => setSelectedTier(t.id)} style={{
                  flex: 1, minWidth: 120, padding: "14px 16px", borderRadius: 10,
                  border: `2px solid ${selectedTier === t.id ? t.color : "#1F2937"}`,
                  background: selectedTier === t.id ? t.bg : "#111827",
                  cursor: "pointer", transition: "all 0.15s", textAlign: "left",
                }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: t.color, fontFamily: "Georgia, serif" }}>{t.name}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#F9FAFB", marginTop: 2 }}>${t.monthlyFee}<span style={{ fontSize: 12, color: "#6B7280", fontWeight: 400 }}>/mo</span></div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ background: "#111827", borderRadius: 14, padding: 24, border: "1px solid #1F2937" }}>
              <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 20 }}>Player Profile</div>

              <Slider label="Events per week" value={eventsPerWeek} min={1} max={7} onChange={setEventsPerWeek} hint="How often does a typical subscriber attend?" />
              <Slider label="Average wins per event" value={avgWins} min={0} max={4} onChange={setAvgWins} hint="0–4 wins. Affects XP earned per event." />

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={goesUndefeated} onChange={(e) => setGoesUndefeated(e.target.checked)}
                    style={{ accentColor: "#0D9488", width: 16, height: 16 }} />
                  <span style={{ fontSize: 13, color: "#D1D5DB" }}>Goes undefeated (+5 XP bonus)</span>
                </label>
              </div>

              <Slider label="Referrals brought per month" value={referralsPerMonth} min={0} max={5} onChange={setReferralsPerMonth}
                format={(v) => `${v} player${v !== 1 ? "s" : ""}`} hint="+50 XP per referral who attends first event" />
              <Slider label="Players taught per month" value={taughtPerMonth} min={0} max={5} onChange={setTaughtPerMonth}
                format={(v) => `${v} player${v !== 1 ? "s" : ""}`} hint="+20 XP per player taught" />

              <div style={{ borderTop: "1px solid #1F2937", paddingTop: 20, marginTop: 4 }}>
                <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 20 }}>Store Variables</div>

                <Slider label="Prize wall item retail price" value={prizeValue} min={10} max={500} step={10} onChange={setPrizeValue}
                  format={(v) => `$${v}`} hint="What you charge customers for this item" />
                <Slider label="Your cost to store" value={prizeCostActual} min={1} max={500} step={1} onChange={setPrizeCostActual}
                  format={(v) => `$${v}`} hint={`Actual cost — not an assumption. Margin: ${calc.prizeMargin}%`} />
                <Slider label="Total subscribers" value={totalSubscribers} min={5} max={200} step={5} onChange={setTotalSubscribers}
                  format={(v) => `${v} members`} hint="Total paying subscribers across the program" />
                <Slider label="Event entry fee" value={entryFee} min={0} max={30} step={1} onChange={setEntryFee}
                  format={(v) => `$${v}`} hint="What players pay to enter each event" />
                <Slider label="Players per event" value={playersPerEvent} min={4} max={32} step={1} onChange={setPlayersPerEvent}
                  format={(v) => `${v} players`} hint="Determines packs given out (ceil(players ÷ 2) per round)" />
                <Slider label="Rounds per event" value={rounds} min={1} max={6} step={1} onChange={setRounds}
                  format={(v) => `${v} rounds`} hint="Number of rounds in a typical event" />
                <Slider label="Pack cost to store" value={packCost} min={1} max={20} step={1} onChange={setPackCost}
                  format={(v) => `$${v}`} hint="Your cost per pack used for pack-per-win prizing" />

                <div style={{ marginTop: 8, padding: "12px 14px", background: "#0B0F1A", borderRadius: 8, fontSize: 12 }}>
                  <div style={{ color: "#6B7280", marginBottom: 8, fontWeight: 600 }}>Event P&L Preview</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#6B7280" }}>Gross entry ({playersPerEvent} × ${entryFee})</span>
                    <span style={{ color: "#F9FAFB" }}>${calc.grossEntryPerEvent}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#6B7280" }}>Prizing cost ({calc.packsPerRound} packs × {rounds} rounds × ${packCost})</span>
                    <span style={{ color: "#EF4444" }}>-${calc.prizingCostPerEvent}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #1F2937", paddingTop: 6, marginTop: 4 }}>
                    <span style={{ color: "#D1D5DB", fontWeight: 700 }}>Net per event</span>
                    <span style={{ color: calc.netEventRevenue >= 0 ? "#10B981" : "#EF4444", fontWeight: 700 }}>${calc.netEventRevenue}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#111827", borderRadius: 14, padding: 20, border: "1px solid #1F2937" }}>
                <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>XP Earn Rate</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <StatCard label="Per Event" value={fmtXP(calc.xpPerEvent)} color="#0D9488" />
                  <StatCard label="Per Month" value={fmtXP(calc.monthlyXP)} sub={`${tier.multiplier}x multiplier applied`} color="#0D9488" />
                </div>
                <div style={{ marginTop: 14, padding: "10px 14px", background: "#0B0F1A", borderRadius: 8, fontSize: 12, color: "#6B7280" }}>
                  Prize wall cost: <span style={{ color: "#F9FAFB", fontWeight: 700 }}>{fmtXP(calc.prizeCost)}</span>
                  <span style={{ color: "#4B5563" }}> (${prizeValue} ÷ 0.30)</span>
                </div>
              </div>

              <div style={{ background: "#111827", borderRadius: 14, padding: 20, border: `1px solid ${tier.border}` }}>
                <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Time to Redeem</div>
                <div style={{ fontSize: 52, fontWeight: 800, color: tier.color, fontFamily: "Georgia, serif", lineHeight: 1 }}>
                  {calc.monthsToRedeem}<span style={{ fontSize: 18, color: "#6B7280", fontWeight: 400 }}> months</span>
                </div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 6 }}>
                  ~{Math.round(calc.eventsPerMonth * calc.monthsToRedeem)} total events attended
                </div>
              </div>

              <div style={{ background: "#111827", borderRadius: 14, padding: 20, border: "1px solid #1F2937" }}>
                <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Revenue Before Prize Is Claimed</div>
                {[
                  { label: `Redeemer's sub fees (${calc.monthsToRedeem} mo × ${fmt(tier.monthlyFee)})`, value: calc.subRevenuePerRedeemer, color: "#0D9488" },
                  { label: `Net event revenue (~${Math.round(calc.eventsPerMonth * calc.monthsToRedeem)} events × $${calc.netEventRevenue} net)`, value: calc.entryFeeRevenue, color: "#0D9488" },
                  { label: `Crowd pool (${totalSubscribers - 1} other subs × ${fmt(tier.monthlyFee)} × ${calc.monthsToRedeem} mo)`, value: calc.crowdPoolRevenue, color: "#F59E0B" },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 2 ? "1px solid #1F2937" : "none" }}>
                    <span style={{ fontSize: 12, color: "#9CA3AF", maxWidth: "70%" }}>{row.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: row.color }}>{fmt(row.value)}</span>
                  </div>
                ))}
                <div style={{ marginTop: 12, padding: "12px 16px", background: "#0B0F1A", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#D1D5DB", fontWeight: 600 }}>Total Revenue</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: "#10B981", fontFamily: "Georgia, serif" }}>{fmt(calc.totalRevenue)}</span>
                </div>
              </div>

              <div style={{ background: "#0B0F1A", borderRadius: 14, padding: 20, border: "1px solid #1F2937" }}>
                <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Prize Wall vs. Just Selling It</div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1, background: "#111827", borderRadius: 10, padding: "14px 16px", border: "1px solid #1F2937" }}>
                    <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>Sell it outright</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#6B7280", fontFamily: "Georgia, serif" }}>{fmt(prizeValue)}</div>
                    <div style={{ fontSize: 10, color: "#4B5563", marginTop: 2 }}>one transaction, done</div>
                  </div>
                  <div style={{ flex: 1, background: "#0D2618", borderRadius: 10, padding: "14px 16px", border: "1px solid #10B981" }}>
                    <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>Put it on prize wall</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#10B981", fontFamily: "Georgia, serif" }}>{fmt(calc.totalRevenue)}</div>
                    <div style={{ fontSize: 10, color: "#4B5563", marginTop: 2 }}>generated before claimed</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, textAlign: "center", padding: "10px", background: calc.trueNet > 0 ? "#0D2618" : "#1F0A0A", borderRadius: 8, border: `1px solid ${calc.trueNet > 0 ? "#10B981" : "#EF4444"}` }}>
                  <span style={{ fontSize: 12, color: "#9CA3AF" }}>Net advantage of prize wall: </span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: calc.trueNet > 0 ? "#10B981" : "#EF4444" }}>
                    {calc.trueNet > 0 ? "+" : ""}{fmt(calc.trueNet)}
                  </span>
                  <div style={{ fontSize: 10, color: "#4B5563", marginTop: 2 }}>after actual cost of prize (${calc.prizeCostToStore})</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, padding: "16px 20px", background: "#111827", borderRadius: 12, border: "1px solid #1F2937", fontSize: 13, color: "#9CA3AF", lineHeight: 1.6 }}>
            <span style={{ color: "#F59E0B", fontWeight: 700 }}>The crowd pool ({fmt(calc.crowdPoolRevenue)}) </span>
            is revenue from subscribers who never redeem anything. They&apos;re funding the prize wall by paying in month after month while only the top earners ever claim a prize. The bigger the subscriber base, the more powerful this effect gets.
          </div>
        </>}
      </div>
    </div>
  );
}
