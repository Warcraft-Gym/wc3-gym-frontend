"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useSeasonStore, setNavigate } from "@/stores";

/** Hands the router to the store, and reads /me again once per load, so a role,
 *  seat or name change shows without a new sign-in. A dead session answers 401,
 *  which the fetch wrapper turns into a new Discord sign-in, or a sign-out. */
export function SessionBridge() {
  const router = useRouter();
  const auth = useAuthStore();
  const { ensureSeasons } = useSeasonStore();
  setNavigate((to: string) => router.push(to));

  useEffect(() => {
    if (!auth.user || (auth.user.dev && auth.me)) return; // a dev login's me is the one it was handed
    auth.fetchMe().catch(() => {});
    ensureSeasons().catch(() => {}); // the menu links the current season by slug
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
