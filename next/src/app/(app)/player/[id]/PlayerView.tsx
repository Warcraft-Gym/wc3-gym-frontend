"use client";
import { useRouter } from "next/navigation";
import { PlayerProfile } from "@/components/player/PlayerProfile";
import { playerPath } from "@/helpers/players.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** The player profile at its own address. The same profile opens as a panel
 *  over any other page, so this page serves typed and shared links. */
export function PlayerView({ id }: { id: string }) {
  const router = useRouter();
  // A typed /player/<name>#<tag> arrives as path + hash, so the key rejoins them.
  // The segment keeps the escape of a tag link, and the read asks for the plain tag.
  const hash = typeof window === "undefined" ? "" : window.location.hash;
  const playerKey = decodeURIComponent(id) + hash;

  // The tag is the address: an id link, and a saved tag change, rewrite it
  const addressTheTag = (player: Row) => {
    const path = playerPath(player);
    if (window.location.pathname + window.location.hash !== path) router.replace(path);
  };

  return <PlayerProfile playerKey={playerKey} onLoaded={addressTheTag} />;
}

export default PlayerView;
