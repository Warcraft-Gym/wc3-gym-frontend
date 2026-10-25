"use client";
import { createContext, useContext, useState } from "react";
import { PlayerStatsPanel, type CupFacts, type Loaded, type PanelTarget } from "@/components/PlayerStatsPanel";
import { useLadderStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
/** Opens the stats panel on an entrant row, or on one player of a team entrant */
export type OpenStats = (row: Row, member?: Row) => void;

const CupStats = createContext<OpenStats | null>(null);

/** The opener of a cup run page's stats panel; null on any other page, where a name keeps its link. */
export const useCupStats = () => useContext(CupStats);

/** The stats panel of a cup's run page, the one GNL captains pair players with: a name inside opens
 *  it beside the page, with the W3Champions ladder of the current season and the cup's own facts in
 *  place of the GNL season. The ladder of each player and race is read once while the page is open.
 *  Off on any other kind of event, whose names keep their links. */
export function CupPlayerStats({ event, on, children }: { event: Row; on: boolean; children: React.ReactNode }) {
  const ladderStore = useLadderStore();
  const [target, setTarget] = useState<{ panel: PanelTarget; facts: CupFacts; key: string } | null>(null);
  const [ladders, setLadders] = useState<Record<string, Loaded>>({});

  const read = async (key: string, userId: number, race: string | null) => {
    setLadders((was) => ({ ...was, [key]: { state: "loading" } }));
    try {
      const data = await ladderStore.userW3cSeason(userId, race);
      setLadders((was) => ({ ...was, [key]: { state: "ok", data } }));
    } catch (error: any) {
      setLadders((was) => ({ ...was, [key]: { state: "error", message: error?.error || error?.message || String(error) } }));
    }
  };

  const open: OpenStats = (row, member) => {
    const user = member?.user ?? row.user;
    if (!user?.id) return;
    // a solo entrant plays the race it signed up with; a team's player is read on their own race
    const race: string | null = (member ? user.race : row.race ?? user.race) || null;
    const division = event.uses_divisions ? (event.divisions || []).find((one: Row) => one.id === row.division_id)?.name ?? null : null;
    const facts: CupFacts = {
      race,
      seed: row.seed ?? null,
      division,
      checkedIn: event.checkin_enabled ? !!row.checked_in_at : null,
      team: row.team?.name ?? null,
      waiting: !!row.waitlisted_at,
    };
    const key = `${user.id}:${race ?? ""}`;
    setTarget({ panel: { player: { ...user, user_id: user.id, race, mmr: member ? null : row.mmr ?? null } }, facts, key });
    const known = ladders[key]?.state;
    if (known !== "ok" && known !== "loading") read(key, user.id, race);
  };

  if (!on) return children;
  return (
    <CupStats.Provider value={open}>
      {children}
      <PlayerStatsPanel
        target={target?.panel ?? null}
        team={null}
        cup={target?.facts ?? null}
        ladder={target ? ladders[target.key] : undefined}
        onClose={() => setTarget(null)}
        onRetry={() => {
          if (target) read(target.key, target.panel.player.user_id, target.facts.race);
        }}
      />
    </CupStats.Provider>
  );
}

export default CupPlayerStats;
