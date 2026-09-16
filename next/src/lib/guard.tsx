"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { saveReturnUrl, takeReturnUrl } from "@/helpers/return-url.mjs";
import { useAuth, useSeasonStore } from "@/stores";
import { canSeeRole, homePath, metaOf } from "@/lib/routes";

/** The port of router.js `beforeEach`. It draws nothing until the route is allowed. */
export function Guard({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const { me } = useAuth();
  const { ensureSeasons } = useSeasonStore();
  const meta = metaOf(path);

  // A season in the path is a slug; the page reads its id off the loaded list.
  const [seasonsFor, setSeasonsFor] = useState<string | null>(null);
  useEffect(() => {
    if (!meta.season) return;
    let alive = true;
    // A failed season list must not abort the navigation; the view shows its own error.
    ensureSeasons()
      .catch(() => {})
      .then(() => alive && setSeasonsFor(path));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.season, path]);
  const seasonsReady = !meta.season || seasonsFor === path;

  const signedInOnLogin = (path === "/login" || path === "/admin-login") && !!me;
  const allowed = !signedInOnLogin && (meta.role === "public" || (!!me && canSeeRole(me.role, meta.role)));

  useEffect(() => {
    if (!seasonsReady || allowed) return;
    if (signedInOnLogin) return router.replace(takeReturnUrl(homePath(me!.role)));
    if (!me) {
      saveReturnUrl(search.size ? `${path}?${search}` : path);
      return router.replace("/login");
    }
    // a guest is not in the Discord server yet: the profile shows the join card, not a locked door
    router.replace(me.role === "guest" ? "/profile" : `/no-access?role=${meta.role}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonsReady, allowed, signedInOnLogin, me, path]);

  return seasonsReady && allowed ? children : null;
}
