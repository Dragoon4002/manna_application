'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Home,
  Rocket,
  Wallet,
  GraphUp,
  Coins,
  Lock,
  Timer,
  Safe,
  AirplaneRotation,
  BookStack,
  CreditCard,
  ShieldCheck,
  Dashboard,
  Settings,
  NavArrowDown,
  NavArrowRight,
  Trash,
  ShieldQuestion,
  CheckCircle,
  PlusCircle,
  Book,
  Globe,
} from 'iconoir-react';

const mainNavItems = [
  { label: 'Home', href: '/home', icon: Home },
  { label: 'Fair Launch', href: '/fair-launch', icon: Rocket },
  { label: 'Portfolio', href: '/portfolio', icon: Wallet },
  { label: 'Trade', href: '/trade', icon: GraphUp },
  { label: 'Tokens', href: '/tokens', icon: Coins },
  { label: 'Locks', href: '/locks', icon: Lock },
  { label: 'Vesting', href: '/vesting', icon: Timer },
  { label: 'Vault', href: '/vault', icon: Safe },
  { label: 'Airdrops', href: '/airdrops', icon: AirplaneRotation },
  { label: 'Staking', href: '/staking', icon: BookStack },
  { label: 'Payouts', href: '/payouts', icon: CreditCard, isNew: true },
  { label: 'Escrow', href: '/escrow', icon: ShieldCheck },
  { label: 'Dashboards', href: '/dashboards', icon: Dashboard },
];

const utilityItems = [
  { label: 'Dust Collector', href: '/utilities/dust-collector', icon: Trash, isNew: true },
  { label: 'Sybil Checker', href: '/utilities/sybil-checker', icon: ShieldQuestion, isNew: true },
  { label: 'Airdrop Checker', href: '/utilities/airdrop-checker', icon: CheckCircle, isNew: true },
  { label: 'Token Mint', href: '/utilities/token-mint', icon: PlusCircle },
  { label: 'Address Book', href: '/utilities/address-book', icon: Book },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const [utilitiesOpen, setUtilitiesOpen] = useState(
    pathname.startsWith('/utilities')
  );
  const [resourcesOpen, setResourcesOpen] = useState(false);

  return (
    <aside className="w-60 min-h-screen bg-gray-900 border-r border-gray-700 flex flex-col py-4 px-3 shrink-0">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
        Main
      </p>

      <nav className="flex flex-col gap-0.5">
        {mainNavItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-w-blue/10 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Icon width={18} height={18} />
              <span>{item.label}</span>
              {item.isNew && (
                <span className="ml-auto text-[10px] font-semibold text-w-success bg-w-success/10 px-1.5 py-0.5 rounded">
                  New
                </span>
              )}
            </Link>
          );
        })}

        <button
          onClick={() => setUtilitiesOpen(!utilitiesOpen)}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors w-full text-left ${
            pathname.startsWith('/utilities')
              ? 'text-white'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <Settings width={18} height={18} />
          <span>Utilities</span>
          {utilitiesOpen ? (
            <NavArrowDown width={14} height={14} className="ml-auto" />
          ) : (
            <NavArrowRight width={14} height={14} className="ml-auto" />
          )}
        </button>

        {utilitiesOpen && (
          <div className="flex flex-col gap-0.5 ml-4">
            {utilityItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    active
                      ? 'bg-w-blue/10 text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon width={16} height={16} />
                  <span>{item.label}</span>
                  {item.isNew && (
                    <span className="ml-auto text-[10px] font-semibold text-w-success bg-w-success/10 px-1.5 py-0.5 rounded">
                      New
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-700">
        <button
          onClick={() => setResourcesOpen(!resourcesOpen)}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors w-full text-left text-gray-400 hover:bg-gray-700 hover:text-white"
        >
          <Globe width={18} height={18} />
          <span>Resources</span>
          {resourcesOpen ? (
            <NavArrowDown width={14} height={14} className="ml-auto" />
          ) : (
            <NavArrowRight width={14} height={14} className="ml-auto" />
          )}
        </button>

        {resourcesOpen && (
          <div className="flex flex-col gap-0.5 ml-4">
            {[
              { label: 'Docs', href: '#' },
              { label: 'Discord', href: '#' },
              { label: 'X (Twitter)', href: '#' },
              { label: 'Privacy Policy', href: '#' },
              { label: 'Terms of Service', href: '#' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-3 py-2 rounded-md text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
