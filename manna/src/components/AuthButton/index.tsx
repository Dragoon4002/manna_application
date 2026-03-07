'use client';
import { walletAuth } from '@/auth/wallet';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { signIn } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';

const IS_DEBUG = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

export const AuthButton = () => {
  const [isPending, setIsPending] = useState(false);
  const [debugAddress, setDebugAddress] = useState('0xB2F129b0D6558f39702Fb44fa9050E889bdd3AAd');
  const { isInstalled } = useMiniKit();
  const hasAttemptedAuth = useRef(false);

  const onClick = useCallback(async () => {
    if (!isInstalled || isPending) return;
    setIsPending(true);
    try {
      await walletAuth();
    } catch (error) {
      console.error('Wallet authentication button error', error);
    } finally {
      setIsPending(false);
    }
  }, [isInstalled, isPending]);

  // Auto-authenticate on load when MiniKit is ready
  useEffect(() => {
    if (isInstalled === true && !hasAttemptedAuth.current && !IS_DEBUG) {
      hasAttemptedAuth.current = true;
      setIsPending(true);
      walletAuth()
        .catch((error) => console.error('Auto wallet authentication error', error))
        .finally(() => setIsPending(false));
    }
  }, [isInstalled]);

  const handleDebugLogin = async () => {
    if (!debugAddress.startsWith('0x')) return;
    setIsPending(true);
    try {
      await signIn('debug', { address: debugAddress, redirectTo: '/home' });
    } catch (error) {
      console.error('Debug login error', error);
    } finally {
      setIsPending(false);
    }
  };

  if (IS_DEBUG) {
    return (
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-xs text-yellow-700">
          Debug mode — MiniKit bypassed
        </div>
        <input
          type="text"
          value={debugAddress}
          onChange={(e) => setDebugAddress(e.target.value)}
          placeholder="0x... ETH address"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
        />
        <Button
          onClick={handleDebugLogin}
          disabled={isPending || !debugAddress.startsWith('0x')}
          size="lg"
          variant="primary"
        >
          {isPending ? 'Logging in...' : 'Debug Login'}
        </Button>
      </div>
    );
  }

  return (
    <LiveFeedback
      label={{ failed: 'Failed to login', pending: 'Logging in', success: 'Logged in' }}
      state={isPending ? 'pending' : undefined}
    >
      <Button onClick={onClick} disabled={isPending} size="lg" variant="primary">
        Login with Wallet
      </Button>
    </LiveFeedback>
  );
};
