'use client';

import { Wallet } from 'iconoir-react';

export const Navbar = () => {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700">
      <span className="text-lg font-bold text-white">Manna</span>
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-w-blue text-w-blue hover:bg-w-blue/10 transition-colors text-sm font-medium">
        <Wallet width={16} height={16} />
        Connect wallet
      </button>
    </header>
  );
};
