'use client';

import { Wallet, LogOut } from 'iconoir-react';
import { useSession, signOut } from 'next-auth/react';
import { walletAuth } from '@/auth/wallet';
import { useCallback, useState } from 'react';

export const Navbar = () => {
  const { data: session, status } = useSession();
  const [isPending, setIsPending] = useState(false);

  const handleConnect = useCallback(async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      await walletAuth();
    } catch (err) {
      console.error('Wallet auth failed', err);
    } finally {
      setIsPending(false);
    }
  }, [isPending]);

  const truncatedAddress = session?.user?.walletAddress
    ? `${session.user.walletAddress.slice(0, 6)}...${session.user.walletAddress.slice(-4)}`
    : null;

  return (
    <div className="relative z-10">
      <header className="flex items-center justify-between px-4 py-3 m-4 rounded-3xl glass">
        <span className="text-lg font-bold text-white">Manna</span>
        {status === 'authenticated' && truncatedAddress ? (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 text-sm font-mono">
              {truncatedAddress}
            </span>
            <button
              onClick={() => signOut()}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 transition-colors"
            >
              <LogOut width={16} height={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isPending || status === 'loading'}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white text-[#0b0e12] text-sm font-semibold transition-colors hover:bg-gray-200 disabled:opacity-50"          >
            <Wallet width={16} height={16} />
            {isPending ? 'Connecting...' : 'Connect wallet'}
          </button>
        )}
      </header>
    </div>
  );
};
