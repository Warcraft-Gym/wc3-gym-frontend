import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Home" };

/** A placeholder for `/`. U7 replaces it with the port of HomeView.vue. */
export default function HomePage() {
  return (
    <>
      <PageHeader title="Home" />
      <p className="text-muted-foreground">The event cards land here.</p>
    </>
  );
}
