"use client";
import { createContext, useContext, useSyncExternalStore } from "react";
import { hideResultsStored, storeHideResults } from "@/helpers/events.mjs";

/** The spoiler switch of the page around a stage drawing. `StageView` and `SeriesBox` read it,
 *  so a page that offers no switch shows every result. The port of the Vue provide key. */
export const HIDE_RESULTS = createContext(false);

export const useHideResults = () => useContext(HIDE_RESULTS);

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The viewer's own choice and the writer for it. The key stays `hideResults`, and the server
 *  renders the results, so a browser with storage blocked reads the same page. */
export function useHideResultsSwitch() {
  const hidden = useSyncExternalStore(subscribe, () => hideResultsStored(), () => false);
  const setHidden = (on: boolean) => {
    storeHideResults(on);
    listeners.forEach((listener) => listener());
  };
  return [hidden, setHidden] as const;
}
