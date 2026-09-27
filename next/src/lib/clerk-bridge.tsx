"use client";
import { useEffect } from "react";
import { useAuth as useClerk } from "@clerk/clerk-react";
import { useRouter } from "next/navigation";
import { saveReturnUrl, takeReturnUrl } from "@/helpers/return-url.mjs";
import { useAuthStore, useSeasonStore, setNavigate, useClerkAuth } from "@/stores";
import { homePath, metaOf } from "@/lib/routes";
import { clerkEnabled } from "@/lib/clerk-provider";

export function ClerkBridge() {
  return clerkEnabled ? <ClerkSessionBridge /> : <RouterBridge />;
}

/** Without a Clerk key only the admin token signs in; the guard sends everyone else to /login. */
function RouterBridge() {
  const router = useRouter();
  setNavigate((to: string) => router.push(to));
  return null;
}

/** The port of App.vue:35-60. Clerk owns the session; the fetch wrapper reads its token
 *  through the auth box, and /me carries the role, name and avatar the nav draws. */
function ClerkSessionBridge() {
  const clerk = useClerk();
  const router = useRouter();
  const auth = useAuthStore();
  const { ensureSeasons } = useSeasonStore();

  useClerkAuth({ getToken: () => clerk.getToken(), signOut: () => clerk.signOut() });
  setNavigate((to: string) => router.push(to));

  useEffect(() => {
    if (!clerk.isLoaded || auth.user) return; // the legacy admin token owns its own session
    let stale = false;
    (async () => {
      // the location is read here, not tracked, so a navigation does not fetch /me again
      const { pathname: path, search } = window.location;
      if (!clerk.isSignedIn) {
        auth.clear();
        if (metaOf(path).role !== "public") {
          saveReturnUrl(`${path}${search}`);
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
  }, [clerk.isLoaded, clerk.isSignedIn]);

  return null;
}
