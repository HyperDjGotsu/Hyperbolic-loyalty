import { TopBar, Hero, PassCard, MonthlyCard, LiveBanner, GamesPanel, BonusCard, CardOfDay, EventRows, ActivityPanel, FriendsPanel, StoreUpdates } from './parts';

// Axis: density. Every Home module on one screen, in a tight 12-column grid with no empty space.
export default function RiffDense() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base text-primary">
      <TopBar />
      <main className="grid min-h-0 flex-1 grid-cols-12 grid-rows-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-4 p-5">
        <Hero compact className="col-span-6" />
        <PassCard className="col-span-4" />
        <MonthlyCard className="col-span-2" />

        <LiveBanner className="col-span-5" />
        <GamesPanel cols={3} className="col-span-4" />
        <div className="col-span-3 flex min-h-0 flex-col gap-4">
          <BonusCard />
          <CardOfDay className="min-h-0 flex-1" />
        </div>

        <EventRows limit={3} className="col-span-3" />
        <ActivityPanel limit={4} className="col-span-3" />
        <FriendsPanel className="col-span-3" />
        <StoreUpdates limit={3} className="col-span-3" />
      </main>
    </div>
  );
}
