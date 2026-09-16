"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/PageHeader";

/** The page a signed-in member or captain lands on when a route needs a higher role. */
export function NoAccessView() {
  const captain = useSearchParams().get("role") === "captain";
  return (
    <div className="mx-auto max-w-[560px] p-4">
      <PageHeader title={<><Icon name="mdi-lock-outline" className="mr-2" />You Need {captain ? "Captain" : "Admin"} Access</>} />
      <p className="mb-6">
        {captain
          ? "This page is for team captains and gym admins. A captain is named on the team's season page."
          : "This page is for gym admins. If you should have access, ask an admin to grant it on the access page."}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button nativeButton={false} render={<Link href="/" />}>Go home</Button>
        <Button variant="secondary" nativeButton={false} render={<Link href="/profile" />}>Your profile</Button>
      </div>
    </div>
  );
}

export default NoAccessView;
