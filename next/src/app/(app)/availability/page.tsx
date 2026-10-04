"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { openBlockedTimes } from "@/stores";

/** The blocked times moved into a dialog over the page the player is on; an old link opens it over Home. */
export default function AvailabilityPage() {
  const router = useRouter();
  useEffect(() => {
    openBlockedTimes();
    router.replace("/");
  }, [router]);
  return null;
}
