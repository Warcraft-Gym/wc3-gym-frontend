"use client";
import { useSyncExternalStore } from "react";

// Vuetify's breakpoints: the app checks smAndDown, mdAndUp and xs only.
export const SM_AND_DOWN = "(max-width: 959.98px)";
export const MD_AND_UP = "(min-width: 960px)";
export const XS = "(max-width: 599.98px)";

/** True while the media query matches. False on the server, so the first paint is the wide one. */
export function useBreakpoint(query: string) {
  return useSyncExternalStore(
    (listener) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Columns marked `mobile: false` are dropped below the md breakpoint. */
export function useColumns<T extends { mobile?: boolean }>(headers: T[]): T[] {
  const mdAndUp = useBreakpoint(MD_AND_UP);
  return headers.filter((h) => mdAndUp || h.mobile !== false);
}
