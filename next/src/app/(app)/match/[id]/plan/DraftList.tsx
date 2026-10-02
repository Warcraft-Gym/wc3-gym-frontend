"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/Icon";
import { PlayerName } from "@/components/PlayerName";
import { cn } from "@/lib/utils";
import { PairingNote } from "../SeriesTables";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** Step 4: the draft both captains share, as many pairings as the captains want. Each pairing marks
 *  the fantasy series, changes its opponent or leaves the draft. The ticked pairings publish, up to the
 *  series the round has left; a pairing that replaces a published series publishes on its own. */
export function DraftList({
  drafts,
  factsOf,
  isFresh,
  replacedLabel,
  outNames,
  publishLeft,
  publishedCount,
  perRound,
  fantasyPublished,
  busy,
  canPublish,
  onToggleFantasy,
  onChange,
  onRemove,
  onRemoveMany,
  onPlayer,
  onPublish,
  onPublishReplace,
}: {
  drafts: Row[];
  factsOf: (draft: Row) => { difference: number; hoursKnown: boolean; hours: number | null; tzWarn: boolean; tzGap: number | null } | null;
  isFresh: (draft: Row) => boolean;
  replacedLabel: (draft: Row) => string | null;
  outNames: (draft: Row) => string[]; // the players of the pairing who do not play the round
  publishLeft: number; // the series the round may still publish
  publishedCount: number;
  perRound: number;
  fantasyPublished: boolean;
  busy: boolean;
  canPublish: boolean;
  onToggleFantasy: (draft: Row) => void;
  onChange: (draft: Row) => void;
  onRemove: (draft: Row) => void;
  onRemoveMany: (drafts: Row[]) => void;
  onPlayer: (id: number) => void;
  onPublish: (chosen: Row[]) => void;
  onPublishReplace: (draft: Row) => void;
}) {
  // The pairings the viewer ticked to publish; until a tick, every pairing when they all fit, none otherwise
  const [ticks, setTicks] = useState<number[] | null>(null);
  const plain = drafts.filter((draft) => !draft.replaces_series_id);
  const chosenIds = ticks ?? (plain.length <= publishLeft ? plain.map((draft) => draft.id) : []);
  const chosen = plain.filter((draft) => chosenIds.includes(draft.id));
  const over = chosen.length - publishLeft;
  const tick = (draft: Row, on: boolean) => setTicks(on ? [...chosenIds.filter((id) => id !== draft.id), draft.id] : chosenIds.filter((id) => id !== draft.id));
  const allTicked = plain.length > 0 && chosen.length === plain.length;
  // the drafts that propose a replacement of the same series; the one published drops the others
  const proposalsOf = (draft: Row) => drafts.filter((row) => row.replaces_series_id && Number(row.replaces_series_id) === Number(draft.replaces_series_id)).length;
  const fantasy = fantasyPublished || chosen.some((draft) => draft.is_fantasy_match);
  if (!drafts.length) return <p className="text-sm text-muted-foreground">No pairing in the draft yet. Select matchups and move them here.</p>;
  return (
    <div className="flex flex-col gap-3">
      {canPublish && plain.length > 1 ? (
        // one box ticks every pairing to publish, or none; the publish button still stops at the round's series
        <div className="flex items-center gap-3 border-b pb-2 text-sm">
          <label className="inline-flex cursor-pointer items-center gap-2 font-medium">
            <Checkbox checked={allTicked} disabled={busy} onCheckedChange={(next) => setTicks(next ? plain.map((draft) => draft.id) : [])} />
            Select all
          </label>
          <span className="tnum text-muted-foreground">
            {chosen.length} of {plain.length} ticked
          </span>
          {chosen.length ? (
            // the ticked pairings leave in one go, so the draft is cleaned up once the round is published
            <Button variant="ghost" size="sm" className="ml-auto text-error" disabled={busy} onClick={() => onRemoveMany(chosen)}>
              <Icon name="mdi-delete" />
              Remove {chosen.length}
            </Button>
          ) : null}
        </div>
      ) : null}
      <ul className="divide-y">
        {drafts.map((draft) => {
          const facts = factsOf(draft);
          const replaces = replacedLabel(draft);
          return (
            <li key={draft.id} className="flex flex-col gap-2 py-3 min-[960px]:flex-row min-[960px]:items-center">
              {canPublish && !draft.replaces_series_id ? (
                <span className="flex shrink-0 items-center gap-2 text-sm">
                  <Checkbox checked={chosenIds.includes(draft.id)} disabled={busy} onCheckedChange={(next) => tick(draft, !!next)} aria-label={`Publish ${draft.player1?.name} vs ${draft.player2?.name}`} />
                  <span aria-hidden="true" className="min-[960px]:hidden">Publish</span>
                </span>
              ) : null}
              <div className="flex min-w-0 grow flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <PlayerName player={draft.player1} race={draft.player1_race || draft.player1?.signup_race} mmr={draft.player1?.mmr ?? null} w3c onClick={() => onPlayer(draft.player1_id)} />
                  <span className="text-muted-foreground">vs</span>
                  <PlayerName player={draft.player2} race={draft.player2_race || draft.player2?.signup_race} mmr={draft.player2?.mmr ?? null} w3c onClick={() => onPlayer(draft.player2_id)} />
                  {facts ? (
                    <span className="tnum text-sm text-muted-foreground">
                      {Number.isFinite(facts.difference) ? `${facts.difference} MMR difference` : "no MMR difference"}
                      {facts.hoursKnown && facts.hours != null ? ` · ${Math.round(facts.hours)} h both free` : ""}
                    </span>
                  ) : null}
                  {facts?.tzWarn ? (
                    <span className="inline-flex items-center gap-1 text-sm text-warning tnum">
                      <Icon name="mdi-alert" size={14} />
                      {facts.tzGap} h apart
                    </span>
                  ) : null}
                </div>
                <PairingNote item={draft} fresh={isFresh(draft)} replaces={replaces} />
                {replaces && proposalsOf(draft) > 1 ? (
                  <span className="text-xs text-muted-foreground">One of {proposalsOf(draft)} proposals for this series; publishing it drops the others.</span>
                ) : null}
                {outNames(draft).map((name) => (
                  <span key={name} className="inline-flex items-center gap-1 text-sm text-warning">
                    <Icon name="mdi-alert" size={14} />
                    {name} is out this round
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  aria-pressed={!!draft.is_fantasy_match}
                  disabled={busy}
                  className={cn(draft.is_fantasy_match ? "border-primary bg-primary text-on-primary hover:bg-primary" : "text-primary-text")}
                  onClick={() => onToggleFantasy(draft)}
                >
                  <Icon name={draft.is_fantasy_match ? "mdi-star" : "mdi-star-outline"} />
                  Fantasy
                </Button>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => onChange(draft)}>
                  <Icon name="mdi-swap-horizontal" />
                  Change opponent
                </Button>
                {replaces && canPublish ? (
                  <Button variant="outline" size="sm" className="text-primary-text" disabled={busy} onClick={() => onPublishReplace(draft)}>
                    <Icon name="mdi-publish" />
                    Publish and replace
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" className="text-error" disabled={busy} aria-label={`Remove ${draft.player1?.name} vs ${draft.player2?.name} from the draft`} onClick={() => onRemove(draft)}>
                  <Icon name="mdi-delete" />
                  Remove
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {!fantasy ? (
        <p className="flex items-center gap-2 text-sm text-warning">
          <Icon name="mdi-alert" size={16} />
          No fantasy series marked yet. Agree on one with the other captain and mark it before you publish.
        </p>
      ) : null}
      {canPublish && plain.length ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <span className={cn("text-sm", over > 0 || !publishLeft ? "text-warning" : "text-muted-foreground")}>
            {!publishLeft
              ? `All ${perRound} series of the round are published. The pairings wait in the draft.`
              : over > 0
                ? `${publishedCount} of ${perRound} series are published. Tick at most ${publishLeft}.`
                : chosen.length
                  ? null
                  : `Tick up to ${publishLeft} pairing${publishLeft === 1 ? "" : "s"} to publish.`}
          </span>
          <Button disabled={busy || !chosen.length || over > 0} onClick={() => onPublish(chosen)}>
            <Icon name="mdi-publish" />
            Publish {chosen.length} series
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default DraftList;
