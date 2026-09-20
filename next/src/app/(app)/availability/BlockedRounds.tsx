"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/skeleton";
import { toneClass } from "@/components/ui/tone";
import { backendUrl, fetchWrapper } from "@/helpers";
import { eventLabel } from "@/helpers/event-labels.mjs";
import { roundLabel } from "@/helpers/rounds.mjs";
import { useAuth, useSeason } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Group = { id: number; label: string; slug: string; rounds: Row[] };

/** The rounds the blocked times answer on their own: one read per event the player is
 *  signed up to, the same read his player page makes. A derived row is never stored, so
 *  the list is read-only and the answer itself is changed on the round. */
export function BlockedRounds({ changed = false }: {
  changed?: boolean; // a saved block moves the rounds it covers, so the list reads as out of date
}) {
  const { me } = useAuth();
  const { seasons, slugOf } = useSeason();
  const [groups, setGroups] = useState<Group[] | null>(null);

  const signedUp: Row[] = (me?.seasons ?? []).filter((season: Row) => season.signed_up);
  const ids = signedUp.map((season: Row) => season.id).join(",");

  useEffect(() => {
    if (!ids) return;
    let live = true;
    (async () => {
      const reads = await Promise.all(signedUp.map((season: Row) =>
        fetchWrapper.get(`${backendUrl}/player-series?season_id=${season.id}`).catch(() => null)));
      if (!live) return;
      setGroups(signedUp.map((season: Row, i: number) => {
        const read: Row | null = reads[i];
        const rounds: Row[] = (read?.rounds ?? []);
        const blocked = (read?.availability ?? [])
          .filter((row: Row) => row.blocked_out)
          .map((row: Row) => rounds.find((round: Row) => round.playday === row.playday) ?? { playday: row.playday })
          .sort((a: Row, b: Row) => a.playday - b.playday);
        const full: Row = (seasons ?? []).find((row: Row) => row.id === season.id) ?? season;
        return { id: season.id, label: eventLabel(full), slug: String(slugOf(season.id)), rounds: blocked };
      }).filter((group: Group) => group.rounds.length));
    })();
    return () => { live = false; };
    // one read per event, at load only: a saved block would cost the same reads again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  // Nothing to say without an event, or once the read lands and no round is covered
  if (!ids || (!changed && groups?.length === 0)) return null;

  return (
    <Card className="mt-6 gap-0 p-0">
      <CardHeader className="bg-primary p-4">
        <CardTitle className="flex items-center gap-2 text-on-primary">
          <Icon name="mdi-calendar" />
          Rounds these cover
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {changed ? (
          <p className="text-sm text-muted-foreground">Your blocks changed. Reload the page to see the rounds they cover.</p>
        ) : groups === null ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          groups.map((group) => (
            <div key={group.id} className="mb-4 last:mb-0">
              <h3 className="mb-2">{group.label}</h3>
              {group.rounds.map((round) => (
                <div key={round.playday} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1 text-sm">
                  <span className="min-w-40">
                    Round {round.playday}
                    {round.start_date ? <span className="text-xs text-muted-foreground"> {roundLabel(round)}</span> : null}
                  </span>
                  <Badge className={toneClass("error")}>
                    <Icon name="mdi-calendar-remove" size={12} />
                    Out (blocked times)
                  </Badge>
                  <Link href={`/seasons/${group.slug}`}>Open event</Link>
                </div>
              ))}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default BlockedRounds;
