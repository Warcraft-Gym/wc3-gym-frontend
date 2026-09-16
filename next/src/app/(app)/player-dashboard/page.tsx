"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/stores";
import { playerPath } from "@/helpers/players.mjs";

/** The dashboard folded into the player page; an old link lands on the player's own profile,
 *  and /profile sends a viewer whose session has not loaded yet to the right body. */
export default function PlayerDashboardPage() {
  const router = useRouter();
  const { me } = useAuth();
  useEffect(() => {
    router.replace(me?.user ? playerPath(me.user) : "/profile");
  }, [me, router]);
  return null;
}
