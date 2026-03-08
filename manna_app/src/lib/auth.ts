import { auth } from '@/auth';

const DEBUG = process.env.DEBUG_MODE === 'true';
const DEFAULT_WALLET = process.env.NEXT_PUBLIC_DEFAULT_WALLET ?? '0x0';

/**
 * Get authenticated session for API routes.
 * In DEBUG mode, returns a fake session using the env wallet.
 */
export async function getAuthSession() {
  if (DEBUG) {
    return {
      user: {
        id: DEFAULT_WALLET,
        walletAddress: DEFAULT_WALLET,
        username: 'debug-user',
        profilePictureUrl: '',
        name: 'debug-user',
        email: null,
        image: null,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    };
  }

  const session = await auth();
  if (!session?.user?.walletAddress) return null;
  return session;
}
