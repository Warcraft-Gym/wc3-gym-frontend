"use client";
import { createContext, useContext } from "react";
import { box, useBox } from "@/stores/box";

// The player panel opens over whatever page you are on, so reading a profile
// never costs a captain his roster ticks or a player his typed scores.
// null means closed; the value is a battle tag, or an id for a row without one.
export const panelPlayerKey = box<string | null>(null);

export const openPlayer = (player: { id?: number | string | null; battleTag?: string | null }) =>
  panelPlayerKey.set(player.battleTag ? String(player.battleTag) : String(player.id));

/** A drafting page and the panel provide this; every PlayerName under them opens the panel. */
export const PanelLinksContext = createContext(false);
export const usePanelLinks = () => useContext(PanelLinksContext);
export const usePanelPlayerKey = () => useBox(panelPlayerKey);
