import { Rocket, PlusCircle } from 'iconoir-react';
import NavCard from '@/components/NavCard';

const items = [
  {
    label: 'Fair Launch',
    description: 'Launch tokens with fair distribution mechanics',
    href: '/fair-launch',
    icon: Rocket,
  },
  {
    label: 'Token Mint',
    description: 'Create and deploy new tokens',
    href: '/utilities/token-mint',
    icon: PlusCircle,
  },
];

export default function LaunchPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Launch</h1>
      <div className="grid gap-3">
        {items.map((item) => (
          <NavCard key={item.href} {...item} />
        ))}
      </div>
    </div>
  );
}
