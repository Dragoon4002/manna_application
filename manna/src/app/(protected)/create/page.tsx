import { auth } from "@/auth";
import { Page } from "@/components/PageLayout";
import { CreateAirdrop } from "@/components/CreateAirdrop";
import { TopBar } from "@worldcoin/mini-apps-ui-kit-react";

export default async function Create() {
  await auth();

  return (
    <>
      <Page.Header className="p-0">
        <TopBar title="Create Airdrop" />
      </Page.Header>
      <Page.Main className="flex flex-col items-center justify-start gap-4 mb-16">
        <CreateAirdrop />
      </Page.Main>
    </>
  );
}
