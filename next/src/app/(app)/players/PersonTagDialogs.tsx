/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/Combobox";
import { Dialog, dialogCompact, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { StatusAlert } from "@/components/StatusAlert";
import { canConfirmMerge, tagsActiveFirst } from "@/helpers/tags.mjs";
import { byNewest } from "@/helpers/season-order.mjs";
import { usePlayerStore } from "@/stores";
import type { MergePreview } from "@/stores";

type Row = Record<string, any>;

// One person in the search: his name, then his Discord handle and newest season, so two people
// of one name read apart without an id
const personLine = (row: Row) => {
  const season = [...(row.signup_seasons ?? [])].sort(byNewest)[0]?.name;
  const tags = (row.tags ?? []).map((tag: Row) => tag.tag).join(", ");
  return (
    <span className="flex min-w-0 flex-col items-start text-left">
      <span className="font-medium">{row.name}</span>
      <span className="truncate text-xs text-muted-foreground">
        {[row.discordTag ? `Discord ${row.discordTag}` : "No Discord", tags || "No tags", season].filter(Boolean).join(". ")}
      </span>
    </span>
  );
};

// The person search both dialogs use; it matches name, tags and Discord handle
function PersonPick({ id, label, players, except, value, onChange }: { id: string; label: string; players: Row[]; except: number; value: number | null; onChange: (id: number | null) => void }) {
  const items = players
    .filter((row) => row.id != null && row.id !== except)
    .map((row) => ({ ...row, value: String(row.id), title: [row.name, row.discordTag, ...(row.tags ?? []).map((tag: Row) => tag.tag)].filter(Boolean).join(" ") }));
  return (
    <Field label={label} htmlFor={id}>
      <Combobox id={id} items={items} value={value == null ? null : String(value)} onChange={(picked) => onChange(picked ? Number(picked) : null)} placeholder="Name, tag or Discord" empty="No person matches" row={personLine} />
    </Field>
  );
}

/** Admin: one tag row of a person moves to another person. */
export function MoveTagDialog({ source, players, onClose, onDone }: { source: Row | null; players: Row[]; onClose: () => void; onDone: () => Promise<void> }) {
  const playerStore = usePlayerStore();
  const tags: Row[] = tagsActiveFirst(source?.tags ?? []);
  // the page keys the dialog by person, so it opens fresh; a person with one tag has it picked
  const [tagId, setTagId] = useState<number | null>(() => (tags.length === 1 ? tags[0].id : null));
  const [toId, setToId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tag = tags.find((row) => row.id === tagId);
  const move = async () => {
    if (!source || tagId == null || toId == null) return;
    setBusy(true);
    setError(null);
    try {
      await playerStore.moveTag(source.id, tagId, toId);
      await onDone();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!source} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent showCloseButton={false} className={`${dialogCompact} max-w-[520px] gap-0 p-0 sm:max-w-[520px]`}>
        <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
          <Icon name="mdi-account-arrow-right" />
          {tag ? `Move tag: ${tag.tag}` : "Move tag"}
        </DialogTitle>
        <div className="flex flex-col gap-4 p-4">
          <StatusAlert modelValue={error} onClose={() => setError(null)} />
          <p>
            From <strong>{source?.name}</strong>
          </p>
          {tags.length > 1 ? (
            <RadioGroup aria-label="Tag to move" value={tagId == null ? "" : String(tagId)} onValueChange={(value) => setTagId(Number(value))}>
              {tags.map((row) => (
                <label key={row.id} className="flex items-center gap-2">
                  <RadioGroupItem value={String(row.id)} />
                  {row.tag}
                  {row.active ? <span className="text-xs text-muted-foreground">Active</span> : null}
                </label>
              ))}
            </RadioGroup>
          ) : null}
          {source ? <PersonPick id="move-tag-to" label="To" players={players} except={source.id} value={toId} onChange={setToId} /> : null}
          <p className="text-sm text-muted-foreground">Past seasons keep the tag they were played as.</p>
        </div>
        <div className="flex justify-end gap-2 p-4 pt-0">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={busy || tagId == null || toId == null} onClick={move}>
            <Icon name={busy ? "mdi-loading mdi-spin" : "mdi-account-arrow-right"} />
            Move tag
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// One titled list of the merge check; an empty list draws nothing
const PreviewList = ({ title, lines, icon, iconClass }: { title: string; lines: string[]; icon: string; iconClass: string }) =>
  lines.length ? (
    <div>
      <h3 className="bg-muted px-3 py-2 font-sans text-sm font-bold">{title}</h3>
      <ul>
        {lines.map((line) => (
          <li key={line} className="flex items-start gap-2 border-t px-3 py-2 text-sm">
            <Icon name={icon} size={16} className={`mt-0.5 ${iconClass}`} />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

/** Admin: one person folds into another. The check runs first and lists what stops the merge,
 *  what it removes and what it moves; the merge runs only when nothing stops it. */
export function MergePlayerDialog({ source, players, onClose, onDone }: { source: Row | null; players: Row[]; onClose: () => void; onDone: () => Promise<void> }) {
  const playerStore = usePlayerStore();
  const [intoId, setIntoId] = useState<number | null>(null);
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const asked = useRef<number | null>(null); // the pick the newest check is for

  // every pick asks the check again, and only the answer for the newest pick lands
  const pick = async (id: number | null) => {
    setIntoId(id);
    setPreview(null);
    setError(null);
    asked.current = id;
    if (!source || id == null) return;
    setChecking(true);
    try {
      const answer: MergePreview = await playerStore.mergePlayer(source.id, id, true);
      if (asked.current === id) setPreview(answer);
    } catch (e) {
      if (asked.current === id) setError((e as Error).message);
    } finally {
      if (asked.current === id) setChecking(false);
    }
  };

  const into = players.find((row) => row.id === intoId);
  const merge = async () => {
    if (!source || intoId == null || !canConfirmMerge(preview)) return;
    setBusy(true);
    setError(null);
    try {
      await playerStore.mergePlayer(source.id, intoId, false);
      await onDone();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!source} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent showCloseButton={false} className={`${dialogCompact} max-w-[560px] gap-0 p-0 sm:max-w-[560px]`}>
        <DialogTitle className="flex items-center gap-2 bg-error px-4 py-3 text-on-error">
          <Icon name="mdi-call-merge" />
          {into ? `Merge ${source?.name} into ${into.name}` : `Merge ${source?.name ?? ""} into`}
        </DialogTitle>
        <div className="flex flex-col gap-4 p-4">
          <StatusAlert modelValue={error} onClose={() => setError(null)} />
          {source ? <PersonPick id="merge-into" label="Merge into" players={players} except={source.id} value={intoId} onChange={pick} /> : null}
          {into ? (
            <p className="text-sm">
              {source?.name}&apos;s seasons, series, bets and tags move to {into.name}. {source?.name} is removed. {into.name} keeps his name and his active tag.
            </p>
          ) : null}
          {checking ? (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="mdi-loading mdi-spin" size={16} />
              Checking what the merge changes
            </p>
          ) : null}
          {preview ? (
            <div className="overflow-hidden rounded-md border">
              <PreviewList title="Stops the merge" lines={preview.stops ?? []} icon="mdi-alert" iconClass="text-warning" />
              <PreviewList title="Removed by the merge" lines={preview.removes ?? []} icon="mdi-delete-outline" iconClass="text-muted-foreground" />
              <PreviewList title="Moves" lines={preview.moves ?? []} icon="mdi-arrow-right" iconClass="text-muted-foreground" />
              {!preview.stops?.length && !preview.removes?.length && !preview.moves?.length ? <p className="px-3 py-2 text-sm text-muted-foreground">Nothing to move.</p> : null}
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 p-4 pt-0">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button className="bg-error text-on-error" disabled={busy || checking || !canConfirmMerge(preview)} onClick={merge}>
            <Icon name={busy ? "mdi-loading mdi-spin" : "mdi-call-merge"} />
            Merge
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
