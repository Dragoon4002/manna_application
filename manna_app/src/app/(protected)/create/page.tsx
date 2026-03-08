'use client';

import { Plus, Coins, AirplaneRotation, Rocket } from 'iconoir-react';
import NavCard from '@/components/NavCard';

const items = [
  { label: 'Deploy Token', description: 'Create a new ERC20 token', href: '/create/token', icon: Plus },
  { label: 'Mint Tokens', description: 'Mint additional supply', href: '/create/token/mint', icon: Coins },
  { label: 'Create Airdrop', description: 'Distribute tokens to verified humans', href: '/create/airdrop', icon: AirplaneRotation },
  { label: 'Create Launch', description: 'Fair launch with bonding curve', href: '/create/launch', icon: Rocket },
];

export default function CreatePage() {
  return (
    <div className="p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Create</h1>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <NavCard key={item.href} {...item} />
        ))}
      </div>
    </div>
  );
}
