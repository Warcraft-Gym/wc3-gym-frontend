"use client";
import { useEffect } from "react";
import { useAuth as useClerk } from "@clerk/clerk-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { saveReturnUrl, takeReturnUrl } from "@/helpers/return-url.mjs";
import { useAuthStore, useSeasonStore, setNavigate, useClerkAuth } from "@/stores";
import { homePath, metaOf } from "@/lib/routes";

/** The port of App.vue:35-60. Clerk owns the session; the fetch wrapper reads its token
 *  through the auth box, and /me carries the role, name and avatar the nav draws. */
export function ClerkBridge() {
  const clerk = useClerk();
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams();
  const auth = useAuthStore();
  const { ensureSeasons } = useSeasonStore();

  useClerkAuth({ getToken: () => clerk.getToken(), signOut: () => clerk.signOut() });
  setNavigate((to: string) => router.push(to));

  useEffect(() => {
    if (!clerk.isLoaded || auth.user) return; // the legacy admin token owns its own session
    let stale = false;
    (async () => {
      if (!clerk.isSignedIn) {
        auth.clear();
        if (metaOf(path).role !== "public") {
          saveReturnUrl(search.size ? `${path}?${search}` : path);
          router.push("/login");
        }
        return;
      }
      const session = await auth.fetchMe().catch((e: Error) => {
        auth.setLoginError(e.message);
        return null;
      });
      if (stale) return;
      if (!session) {
        await auth.logout();
        return;
      }
      ensureSeasons().catch(() => {}); // the menu links the current season by slug
      if (path === "/login") router.push(takeReturnUrl(homePath(session.role)));
    })();
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerk.isLoaded, clerk.isSignedIn, path]);

  return null;
}
