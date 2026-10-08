"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/PageHeader";

/** The page a signed-in member or captain lands on when a route needs a higher role, or an
 *  organizer's page; the Events page is where a member asks to become one. */
export function NoAccessView() {
  const role = useSearchParams().get("role");
  const captain = role === "captain";
  const organizer = role === "organizer";
  return (
    <div className="mx-auto max-w-[560px] p-4">
      <PageHeader title={<><Icon name="mdi-lock-outline" className="mr-2" />You Need {captain ? "Captain" : organizer ? "Organizer" : "Admin"} Access</>} />
      <p className="mb-6">
        {captain
          ? "This page is for team captains and gym admins. A captain is named on the team's season page."
          : organizer
            ? "This page is for cup organizers. You can ask for organizer access on the Events page; an admin answers it."
            : "This page is for gym admins. If you should have access, ask an admin to grant it on the access page."}
      </p>
      <div className="flex flex-wrap gap-3">
        {organizer ? <Button nativeButton={false} render={<Link href="/events" />}>Go to Events</Button> : null}
        <Button variant={organizer ? "secondary" : "default"} nativeButton={false} render={<Link href="/" />}>Go home</Button>
        <Button variant="secondary" nativeButton={false} render={<Link href="/profile" />}>Your profile</Button>
      </div>
    </div>
  );
}

export default NoAccessView;
