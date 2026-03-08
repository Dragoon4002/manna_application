'use client';

import { useSession } from 'next-auth/react';
import { walletAuth } from '@/auth/wallet';
import { Wallet } from 'iconoir-react';
import { useCallback, useState } from 'react';

const DEBUG = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

/**
 * Wraps interactive sections that require authentication.
 * In DEBUG mode, bypasses auth and renders children directly.
 */
export const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSession();
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

  // In debug mode, skip auth entirely
  if (DEBUG) return <>{children}</>;

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-6">
        <p className="text-gray-400 text-sm">Connect your wallet to continue</p>
        <button
          onClick={handleConnect}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0b0e12] text-sm font-semibold transition-colors hover:bg-gray-200 disabled:opacity-50"
        >
          <Wallet width={16} height={16} />
          {isPending ? 'Connecting...' : 'Connect wallet'}
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
