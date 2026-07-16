'use client';

import { useState, useEffect } from 'react';

interface PrizeWallItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  xp_cost: number;
  retail_value: number | null;
  quantity: number | null;
  unlock_threshold: number | null;
  is_unlocked: boolean;
}

export default function PrizeWallPage() {
  const [items, setItems] = useState<PrizeWallItem[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/prize-wall')
      .then(r => r.json())
      .then(data => {
        setItems(data.items || []);
        setSubscriberCount(data.subscriber_count || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const floor = items.filter(i => !i.unlock_threshold);
  const locked = items.filter(i => i.unlock_threshold && !i.is_unlocked);
  const unlocked = items.filter(i => i.unlock_threshold && i.is_unlocked);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-primary">Prize Wall</h1>
        <p className="text-secondary text-sm mt-1">
          Spend your Points on real prizes. Points never expire.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-tertiary text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-tertiary text-sm">
          No prizes available yet. Check back soon.
        </div>
      ) : (
        <>
          {floor.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-4">
                Always Available
              </h2>
              <ItemGrid items={floor} subscriberCount={subscriberCount} />
            </section>
          )}

          {unlocked.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-4">
                Community Unlocked
              </h2>
              <ItemGrid items={unlocked} subscriberCount={subscriberCount} />
            </section>
          )}

          {locked.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
                Community Goals
              </h2>
              <p className="text-xs text-tertiary mb-4">
                {subscriberCount} active {subscriberCount === 1 ? 'subscriber' : 'subscribers'} across
                the network. Grow the community to unlock these.
              </p>
              <div className="space-y-3">
                {locked.map(item => (
                  <LockedItem key={item.id} item={item} subscriberCount={subscriberCount} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ItemGrid({ items, subscriberCount }: { items: PrizeWallItem[]; subscriberCount: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {items.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function ItemCard({ item }: { item: PrizeWallItem }) {
  return (
    <div className="bg-surface rounded-xl overflow-hidden">
      <div className="aspect-square bg-elevated">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-tertiary text-xs">
            No image
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="font-semibold text-primary text-sm leading-tight">{item.name}</div>
        {item.description && (
          <div className="text-xs text-tertiary mt-1 leading-snug">{item.description}</div>
        )}
        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <span className="text-lg font-bold text-primary">{item.xp_cost.toLocaleString()}</span>
            <span className="text-xs text-secondary ml-1">pts</span>
          </div>
          {item.retail_value != null && (
            <span className="text-xs text-tertiary">${item.retail_value} value</span>
          )}
        </div>
        {item.quantity != null && (
          <div className="text-xs text-tertiary mt-1">{item.quantity} remaining</div>
        )}
        <button
          className="mt-3 w-full py-2 bg-accent text-accent-fg text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          onClick={() => alert('Ask staff at the counter to process your redemption.')}
        >
          Redeem
        </button>
      </div>
    </div>
  );
}

function LockedItem({ item, subscriberCount }: { item: PrizeWallItem; subscriberCount: number }) {
  const threshold = item.unlock_threshold!;
  const pct = Math.min(100, Math.round((subscriberCount / threshold) * 100));

  return (
    <div className="bg-surface rounded-xl p-4 flex gap-4 opacity-70">
      <div className="w-16 h-16 bg-elevated rounded-lg flex-shrink-0 overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover grayscale"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-tertiary text-xs">
            —
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold text-primary text-sm">{item.name}</div>
            {item.description && (
              <div className="text-xs text-tertiary mt-0.5">{item.description}</div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-bold text-primary">{item.xp_cost.toLocaleString()} pts</div>
            {item.retail_value != null && (
              <div className="text-xs text-tertiary">${item.retail_value} value</div>
            )}
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-tertiary mb-1">
            <span>Unlocks at {threshold} subscribers</span>
            <span>{subscriberCount} / {threshold}</span>
          </div>
          <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
