import { auth } from '@/auth';
import { NextResponse } from 'next/server';

const DEBUG = process.env.DEBUG_MODE === 'true';

// In DEBUG mode, skip auth. In production, use next-auth middleware.
export default DEBUG
  ? function middleware() { return NextResponse.next(); }
  : auth;

export const config = {
  matcher: [
    '/api/airdrop/claim/:path*',
    '/api/airdrop/create/:path*',
    '/api/token/:path*',
    '/api/staking/stake/:path*',
    '/api/staking/unstake/:path*',
    '/api/staking/claim-rewards/:path*',
    '/api/payouts/create/:path*',
    '/api/vesting/:path*',
    '/api/launch/contribute/:path*',
  ],
};
