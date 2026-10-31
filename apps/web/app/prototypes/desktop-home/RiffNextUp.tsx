import { TopBar, Hero, NextActionCard, BonusCard, CardOfDay, EventRows, ActivityPanel, GamesPanel } from './parts';

// Axis: hierarchy by action. The biggest thing on screen is what the player should do right now; identity and stats shrink to a strip.
export default function RiffNextUp() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base text-primary">
      <TopBar />
      <main className="grid min-h-0 flex-1 grid-cols-[1fr_1fr_340px] grid-rows-[auto_minmax(0,1.2fr)_minmax(0,1fr)] gap-5 p-6">
        <Hero compact className="col-span-2" />
        <NextActionCard className="col-span-2" />
        <GamesPanel cols={6} className="col-span-2" />
        <aside className="row-span-3 col-start-3 row-start-1 flex min-h-0 flex-col gap-5">
          <BonusCard />
          <CardOfDay />
          <EventRows limit={2} className="flex-1" />
          <ActivityPanel limit={3} className="flex-1" />
        </aside>
      </main>
    </div>
  );
}
