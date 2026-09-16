import { useSyncExternalStore } from "react";

export type Box<T> = {
  get: () => T;
  getServer: () => T;
  set: (next: T) => void;
  subscribe: (listener: () => void) => () => void;
};

/** Module state React can read. The fetch wrapper and the guard read the same box outside React.
 *  `serverValue` is what the server rendered, so a box seeded from localStorage hydrates clean. */
export function box<T>(initial: T, serverValue: T = initial): Box<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  };
  return { get: () => value, getServer: () => serverValue, set: (next) => { value = next; listeners.forEach((l) => l()); }, subscribe };
}

export const useBox = <T,>(b: Box<T>): T => useSyncExternalStore(b.subscribe, b.get, b.getServer);
