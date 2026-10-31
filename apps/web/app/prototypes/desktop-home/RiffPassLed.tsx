import { TopBar, Hero, PassCard, MonthlyCard, CardOfDay, EventRows, ActivityPanel, GamesPanel, BonusCard } from './parts';

// Axis: status and progress. Who you are in the system (pass, multiplier, credit, monthly goal) sits beside the hero as a first-class module.
export default function RiffPassLed() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base text-primary">
      <TopBar />
      <main className="grid min-h-0 flex-1 grid-cols-[1fr_1fr_340px] grid-rows-[auto_1fr] gap-5 p-6">
        <Hero className="col-span-2" />
        <aside className="row-span-2 col-start-3 row-start-1 flex min-h-0 flex-col gap-5">
          <PassCard />
          <MonthlyCard />
          <CardOfDay />
          <EventRows limit={3} className="flex-1" />
        </aside>
        <GamesPanel cols={3} />
        <div className="flex min-h-0 flex-col gap-5">
          <BonusCard />
          <ActivityPanel limit={5} className="flex-1" />
        </div>
      </main>
    </div>
  );
}
