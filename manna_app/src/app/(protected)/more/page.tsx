import {
  GraphUp,
  Coins,
  ShieldCheck,
  Trash,
  ShieldQuestion,
  CheckCircle,
  Book,
  Dashboard,
  Lock,
} from 'iconoir-react';
import NavCard from '@/components/NavCard';

const groups = [
  {
    title: 'Trade & Markets',
    items: [
      { label: 'Trade', href: '/trade', icon: GraphUp },
      { label: 'Tokens', href: '/tokens', icon: Coins },
      { label: 'Escrow', href: '/escrow', icon: ShieldCheck },
    ],
  },
  {
    title: 'Tools & Utilities',
    items: [
      { label: 'Dust Collector', href: '/utilities/dust-collector', icon: Trash, isNew: true },
      { label: 'Sybil Checker', href: '/utilities/sybil-checker', icon: ShieldQuestion, isNew: true },
      { label: 'Airdrop Checker', href: '/utilities/airdrop-checker', icon: CheckCircle, isNew: true },
      { label: 'Address Book', href: '/utilities/address-book', icon: Book },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Dashboards', href: '/dashboards', icon: Dashboard },
      { label: 'Locks', href: '/locks', icon: Lock },
    ],
  },
];

export default function MorePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">More</h1>
      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {group.title}
            </p>
            <div className="grid gap-2">
              {group.items.map((item) => (
                <NavCard key={item.href} {...item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
