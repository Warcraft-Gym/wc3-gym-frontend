import { box, useBox } from "./box";

/** The blocked-times dialog the app shell holds for every page: whether it is open, and a count that
 *  moves when it closes after a save, so a page that shows the rounds the blocks cover reads them again. */
const blockedTimes = box({ open: false, changed: 0 });

export const openBlockedTimes = () => blockedTimes.set({ ...blockedTimes.get(), open: true });

export const closeBlockedTimes = (saved: boolean) => {
  const { changed } = blockedTimes.get();
  blockedTimes.set({ open: false, changed: saved ? changed + 1 : changed });
};

export const useBlockedTimes = () => useBox(blockedTimes);
