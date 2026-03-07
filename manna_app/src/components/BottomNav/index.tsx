'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Rocket, Wallet, GraphUp, Menu } from 'iconoir-react';

const tabs = [
  {
    label: 'Home',
    href: '/home',
    icon: Home,
    match: ['/home'],
  },
  {
    label: 'Launch',
    href: '/launch',
    icon: Rocket,
    match: ['/launch', '/fair-launch', '/utilities/token-mint'],
  },
  {
    label: 'Earn',
    href: '/earn',
    icon: Wallet,
    match: ['/earn', '/airdrops', '/staking', '/payouts', '/vesting'],
  },
  {
    label: 'Portfolio',
    href: '/portfolio',
    icon: GraphUp,
    match: ['/portfolio', '/vault', '/locks'],
  },
  {
    label: 'More',
    href: '/more',
    icon: Menu,
    match: [
      '/more',
      '/trade',
      '/tokens',
      '/escrow',
      '/dashboards',
      '/utilities/dust-collector',
      '/utilities/sybil-checker',
      '/utilities/airdrop-checker',
      '/utilities/address-book',
    ],
  },
];

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const active = tab.match.some((m) => pathname.startsWith(m));
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors ${
                active ? 'text-w-blue' : 'text-gray-500'
              }`}
            >
              <Icon width={20} height={20} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
