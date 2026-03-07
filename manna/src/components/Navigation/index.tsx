'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, List, PlusCircle } from 'iconoir-react';
import { usePathname, useRouter } from 'next/navigation';

export const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();

  const current = pathname.includes('/claims')
    ? 'claims'
    : pathname.includes('/create')
      ? 'create'
      : 'home';

  const handleChange = (value: string) => {
    if (value === 'home') router.push('/home');
    else if (value === 'claims') router.push('/claims');
    else if (value === 'create') router.push('/create');
  };

  return (
    <Tabs value={current} onValueChange={handleChange}>
      <TabItem value="home" icon={<Home />} label="Airdrops" />
      <TabItem value="claims" icon={<List />} label="Claims" />
      <TabItem value="create" icon={<PlusCircle />} label="Create" />
    </Tabs>
  );
};
