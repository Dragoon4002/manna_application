import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Navbar />
      <main className="flex-1 pb-16">{children}</main>
      <BottomNav />
    </div>
  );
}
