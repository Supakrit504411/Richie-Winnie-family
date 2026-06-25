'use client';

interface ShopCardProps {
  item: {
    id: string;
    name: string;
    icon?: string;
    price: number;
    active?: boolean;
  };
  userCoins: number;
  onRedeem?: (itemId: string) => void;
}

export default function ShopCard({ item, userCoins, onRedeem }: ShopCardProps) {
  const canAfford = userCoins >= item.price;

  return (
    <div className="card mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{item.icon || '🎁'}</span>
          <div>
            <p className="font-bold">{item.name}</p>
            <p className="muted text-sm">{item.price} 🪙</p>
          </div>
        </div>
        <button
          className={`btn btn-sm ${canAfford ? 'btn-gold' : 'btn-ghost'}`}
          disabled={!canAfford}
          onClick={() => onRedeem?.(item.id)}
        >
          แลก
        </button>
      </div>
    </div>
  );
}
