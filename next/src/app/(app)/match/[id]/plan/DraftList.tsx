"use client";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { PlayerName } from "@/components/PlayerName";
import { cn } from "@/lib/utils";
import { PairingNote } from "../SeriesTables";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** Step 4: the draft both captains share. Each pairing marks the fantasy series, changes its
 *  opponent or leaves the draft; a pairing that replaces a published series publishes on its own. */
export function DraftList({
  drafts,
  factsOf,
  isFresh,
  replacedLabel,
  outNames,
  busy,
  canPublish,
  onToggleFantasy,
  onChange,
  onRemove,
  onPublishAll,
  onPublishReplace,
}: {
  drafts: Row[];
  factsOf: (draft: Row) => { difference: number; hoursKnown: boolean; hours: number | null; tzWarn: boolean; tzGap: number | null } | null;
  isFresh: (draft: Row) => boolean;
  replacedLabel: (draft: Row) => string | null;
  outNames: (draft: Row) => string[]; // the players of the pairing who do not play the round
  busy: boolean;
  canPublish: boolean;
  onToggleFantasy: (draft: Row) => void;
  onChange: (draft: Row) => void;
  onRemove: (draft: Row) => void;
  onPublishAll: () => void;
  onPublishReplace: (draft: Row) => void;
}) {
  const plain = drafts.filter((draft) => !draft.replaces_series_id);
  const fantasy = drafts.filter((draft) => draft.is_fantasy_match).length;
  if (!drafts.length) return <p className="text-sm text-muted-foreground">No pairing in the draft yet. Add matchups from the list above.</p>;
  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-y">
        {drafts.map((draft) => {
          const facts = factsOf(draft);
          const replaces = replacedLabel(draft);
          return (
            <li key={draft.id} className="flex flex-col gap-2 py-3 min-[960px]:flex-row min-[960px]:items-center">
              <div className="flex min-w-0 grow flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <PlayerName player={draft.player1} race={draft.player1_race || draft.player1?.signup_race} mmr={draft.player1?.mmr ?? null} w3c />
                  <span className="text-muted-foreground">vs</span>
                  <PlayerName player={draft.player2} race={draft.player2_race || draft.player2?.signup_race} mmr={draft.player2?.mmr ?? null} w3c />
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
          <span className="text-sm text-muted-foreground">Either captain can publish. The players see their series right after.</span>
          <Button disabled={busy} onClick={onPublishAll}>
            <Icon name="mdi-publish" />
            Publish {plain.length} series
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default DraftList;
