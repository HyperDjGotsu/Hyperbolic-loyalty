import { TopBar, Hero, LiveBanner, StoreUpdates, GamesPanel, CardOfDay, ActivityPanel, BonusCard } from './parts';

// Axis: store-first content. What is happening at the store right now takes the big area; the player's own numbers are a compact strip.
export default function RiffStoreLive() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base text-primary">
      <TopBar />
      <main className="grid min-h-0 flex-1 grid-cols-[1.5fr_1fr_340px] grid-rows-[auto_1fr] gap-5 p-6">
        <Hero compact className="col-span-2" />
        <BonusCard />
        <div className="flex min-h-0 flex-col gap-5">
          <LiveBanner big className="min-h-0 flex-1" />
          <StoreUpdates limit={3} className="h-[170px] shrink-0" />
        </div>
        <GamesPanel cols={2} />
        <div className="flex min-h-0 flex-col gap-5">
          <CardOfDay />
          <ActivityPanel limit={4} className="flex-1" />
        </div>
      </main>
    </div>
  );
}
