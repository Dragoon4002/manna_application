import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { AuthGate } from '@/components/AuthGate';

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 min-h-screen bg-linear-to-b from-[#0b0e12] to-[#1a1f2e] flex flex-col">
      <Navbar />
      <div className="absolute left-6/12 h-80 w-80 -z-20 bg-radial from-transparent via-blue-500/5 to-blue-500/20 blur-lg -translate-x-6/12 -translate-y-6/12 border-4 border-blue-500 rounded-full" />
      <div className="absolute left-6/12 h-80 w-80 -z-20 bg-transparent blur-xs -translate-x-6/12 -translate-y-6/12 border border-blue-800 rounded-full" />
      <main className="flex-1 pb-20">
        <AuthGate>{children}</AuthGate>
      </main>
      <BottomNav />
    </div>
  );
}
