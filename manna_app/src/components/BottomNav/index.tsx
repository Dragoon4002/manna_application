'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Plus, Clock, Menu } from 'iconoir-react';

const tabs = [
  { label: 'Home', href: '/home', icon: Home, match: ['/home', '/wallet'] },
  { label: 'Explore', href: '/explore', icon: Search, match: ['/explore'] },
  { label: 'Create', href: '/create', icon: Plus, match: ['/create'], center: true },
  { label: 'History', href: '/history', icon: Clock, match: ['/history'] },
  { label: 'More', href: '/more', icon: Menu, match: ['/more'] },
];

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="glass rounded-t-3xl border-t border-white/10">
        <div className="flex items-center justify-around py-2 relative">
          {tabs.map((tab) => {
            const active = tab.match.some((m) => pathname.startsWith(m));
            const Icon = tab.icon;

            // if (tab.center) {
            //   return (
            //     <Link
            //       key={tab.href}
            //       href={tab.href}
            //       className="flex items-center justify-center -mt-7"
            //     >
            //       <div className="w-14 h-14 rounded-full bg-radial from-white/50 to-white-900 flex items-center justify-center shadow-lg glow-accent">
            //         <Icon width={24} height={24} className="text-white" strokeWidth={2.5} />
            //       </div>
            //     </Link>
            //   );
            // }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors ${
                  active ? 'text-white font-semibold' : 'text-gray-500'
                }`}
              >
                <Icon width={20} height={20} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
