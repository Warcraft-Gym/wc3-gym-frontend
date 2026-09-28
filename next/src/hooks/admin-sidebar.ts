"use client";
import { useSyncExternalStore } from "react";

// The admin's choice to hide the sidebar, kept in this browser only. A browser that refuses storage
// (a private window, blocked site data) keeps the choice for this page view and opens it on reload.
const KEY = "admin-sidebar";
const listeners = new Set<() => void>();
// the choice of this page view, which stands in when the browser refuses storage
let openHere = true;

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== "hidden";
  } catch {
    return openHere;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // another tab that changes the choice moves this one too
  const onStorage = (event: StorageEvent) => event.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Whether the admin sidebar is open, and the setter that keeps the choice. The server and the first
 *  paint read it open, so the page never flips between them. */
export function useAdminSidebarOpen(): [boolean, (open: boolean) => void] {
  const open = useSyncExternalStore(subscribe, read, () => true);
  const setOpen = (next: boolean) => {
    openHere = next;
    try {
      if (next) window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, "hidden");
    } catch {
      // the choice lives for this page view only
    }
    listeners.forEach((listener) => listener());
  };
  return [open, setOpen];
}
