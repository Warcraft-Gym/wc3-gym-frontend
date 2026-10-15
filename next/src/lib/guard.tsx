"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { saveReturnUrl, takeReturnUrl } from "@/helpers/return-url.mjs";
import { useAuth, useSeasonStore } from "@/stores";
import { canSeeRole, homePath, metaOf } from "@/lib/routes";
import { devLoginEnabled } from "@/components/DevLoginCard";

/** The port of router.js `beforeEach`. It draws nothing until the route is allowed. */
export function Guard({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const { me, user } = useAuth();
  // useAuth answers the signed-out server snapshot until hydration, so the redirect waits for it
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const { ensureSeasons } = useSeasonStore();
  const meta = metaOf(path);

  // A season in the path is a slug; the page reads its id off the loaded list. The flag stays
  // true once the list settles, so a page that rewrites its own path is not remounted.
  const [seasonsLoaded, setSeasonsLoaded] = useState(false);
  useEffect(() => {
    if (!meta.season || seasonsLoaded) return;
    let alive = true;
    // A failed season list must not abort the navigation; the view shows its own error.
    ensureSeasons()
      .catch(() => {})
      .then(() => alive && setSeasonsLoaded(true));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.season, seasonsLoaded]);
  const seasonsReady = !meta.season || seasonsLoaded;

  // the admin token's session stays on /admin-login while the local dev login is on: it picks there
  // between the super admin and a player
  const choosing = path === "/admin-login" && devLoginEnabled && !!user && !user.dev && !!me?.superadmin;
  const signedInOnLogin = (path === "/login" || path === "/admin-login") && !!me && !choosing;
  const organizerOk = !meta.organizer || me?.role === "admin" || !!me?.organizer;
  const allowed = !signedInOnLogin && organizerOk && (meta.role === "public" || (!!me && canSeeRole(me.role, meta.role)));

  useEffect(() => {
    if (!hydrated || !seasonsReady || allowed) return;
    if (signedInOnLogin) return router.replace(takeReturnUrl(homePath(me!.role)));
    if (!me) {
      saveReturnUrl(search.size ? `${path}?${search}` : path);
      return router.replace("/login");
    }
    // a guest is not in the Discord server yet: the profile shows the join card, not a locked door
    router.replace(me.role === "guest" ? "/profile" : `/no-access?role=${organizerOk ? meta.role : "organizer"}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, seasonsReady, allowed, signedInOnLogin, me, path]);

  return hydrated && seasonsReady && allowed ? children : null;
}
