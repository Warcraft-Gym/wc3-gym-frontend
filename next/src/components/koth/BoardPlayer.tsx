"use client";
import { PlayerName } from "@/components/PlayerName";
import { noStatsWarning } from "@/helpers/games-rule.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** One player of the board as the app draws a player line: flag, name, race, one MMR. A player
 *  W3Champions holds no rating for wears the games mark instead of a number. */
export function BoardPlayer({ row, race, plain, slot, warn, noFlag }: { row: Row; race?: string | null; plain?: boolean; slot?: boolean; warn?: boolean; noFlag?: boolean }) {
  const shown = race === undefined ? row.race : race;
  const marked = warn === undefined ? row.mmr == null : warn;
  const warning = marked ? noStatsWarning(shown) : null;
  // only a line in a column of player lines keeps the empty mark slot, so its flags read as one column;
  // the board names a battle tag only where two players share a name, and then the tag is the name
  return (
    <PlayerName
      player={{ id: row.user_id ?? null, name: row.battle_tag || row.name, country: row.country, battleTag: row.battle_tag }}
      race={shown || undefined}
      mmr={row.mmr ?? false}
      warning={warning ?? (slot ? null : undefined)}
      plain={plain}
      noFlag={noFlag}
    />
  );
}
