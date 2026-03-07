import { auth } from '@/auth';
import { Page } from '@/components/PageLayout';
import { ClaimHistory } from '@/components/ClaimHistory';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';

export default async function Claims() {
  await auth();

  return (
    <>
      <Page.Header className="p-0">
        <TopBar title="My Claims" />
      </Page.Header>
      <Page.Main className="flex flex-col items-center justify-start gap-4 mb-16">
        <ClaimHistory />
      </Page.Main>
    </>
  );
}
