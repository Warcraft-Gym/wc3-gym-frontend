"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { toneClass } from "@/components/ui/tone";
import { PlayerName } from "@/components/PlayerName";
import { RaceIcon } from "@/components/RaceIcon";
import { RaceSelect } from "@/components/RaceSelect";
import { StatusAlert } from "@/components/StatusAlert";
import { warningLabel } from "@/helpers/entrants.mjs";
import { eventLabel } from "@/helpers/event-labels.mjs";
import { noStatsWarning } from "@/helpers/games-rule.mjs";
import { bracketName, signupPlace } from "@/helpers/koth-signup.mjs";
import { defaultSignupRace } from "@/helpers/players.mjs";
import { raceWrapper } from "@/helpers/races.js";
import { battleTagError, isTagError } from "@/helpers/signup.mjs";
import { useAuthStore, useEventStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const raceName = (race: string) => raceWrapper.getRaceObject(race)?.name || race;

/** A member entering one event: the race he plays it on, a note on a signup-only event, a
 *  battle tag when the event takes anyone and the caller has no linked account, and the
 *  eligibility warnings the API answered. On an event that takes one entry per race a member
 *  already in enters another race, and the races he holds are not offered again. A warning
 *  never blocks: the entrant is in, and the chips say what an admin will look at.
 *  A KOTH night ends on its own state instead: the bracket and the place in line the board
 *  read answers, or the note that W3Champions rated no race yet and an admin places the row. */
export function SignupDialog({
  event,
  held = [], // the races the caller already entered on
  open,
  onOpenChange,
  onSignedUp,
}: {
  event: Row;
  held?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignedUp?: (entrant: Row) => void;
}) {
  const auth = useAuthStore();
  const store = useEventStore();

  // An event open to anyone takes a battle tag from a caller whose account names no player
  const needsTag = event.signup_policy === "anyone" && !auth.me?.user;
  // A signup-only event is a list of what people want to work on, so it asks for the note
  const takesNote = event.kind === "signup";
  // The event kind picks the end state: a KOTH night says where the entrant stands tonight
  const koth = event.kind === "koth";
  // The races the dialog leaves out: only an event that takes one entry per race holds any
  const taken: string[] = event.multi_entry ? held : [];
  const another = taken.length > 0;

  const usual = defaultSignupRace(auth.me?.user, () => 0);
  const [race, setRace] = useState<string | null>(taken.includes(usual) ? null : usual);
  const [battleTag, setBattleTag] = useState("");
  const [note, setNote] = useState("");
  const [entrant, setEntrant] = useState<Row | null>(null);
  const [place, setPlace] = useState<{ bracket: string; placeWord: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);

  const ready = !!race && (!needsTag || battleTag.trim().length > 2);
  const warnings: string[] = entrant?.warnings ?? [];
  // The signup answered a bracket, so the line the board draws names the place
  const placed = entrant?.division_id != null;
  // The event row already carries its divisions, so the bracket has a name without a second read
  const divisions: Row[] = event.divisions || [];
  const at = placed ? divisions.findIndex((one: Row) => one.id === entrant?.division_id) : -1;
  const bracket: string | null = place?.bracket || (at < 0 ? null : bracketName(divisions[at], at));
  const tag = entrant?.user?.battleTag || battleTag.trim();
  // The one mark the app draws for a race W3Champions holds no stats on
  const noStats = entrant?.race ? noStatsWarning(entrant.race) : null;

  const submit = async () => {
    setError(null);
    const shape = needsTag ? battleTagError(battleTag) : null;
    setTagError(shape);
    if (shape) return;
    setSaving(true);
    try {
      const row = await store.signUp(event.id, {
        race,
        note: note.trim() || null,
        battle_tag: needsTag ? battleTag.trim() : null,
      });
      onSignedUp?.(row);
      // One public read, edge cached: where the night put the new row in its bracket's line
      if (koth && row?.division_id != null) {
        try {
          setPlace(signupPlace(await store.fetchBoard(event.id), row.id));
        } catch {
          setPlace(null); // no board answered, so the event row names the bracket alone
        }
      }
      // Last, so the form holds its spinner until the place is known and the end state prints once
      setEntrant(row);
    } catch (e) {
      const failed = e as Error & { status?: number };
      // A refusal that names the battle tag lands under the field; every other one is a dialog error
      if (needsTag && failed.status === 400 && isTagError(failed.message)) setTagError(failed.message);
      else setError(`The signup did not go through: ${failed.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-[520px] gap-0 p-0 sm:max-w-[520px]">
        <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
          <Icon name="mdi-account-plus" />
          {another ? "Enter another race" : `Sign up for ${eventLabel(event)}`}
        </DialogTitle>

        <StatusAlert modelValue={error} onClose={() => setError(null)} className="mx-4 mt-3" />

        <div className="flex flex-col gap-3 p-4">
          {!entrant ? (
            <>
              {another ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">You are in on</span>
                  {taken.map((raceId) => (
                    <span key={raceId} className="inline-flex items-center gap-1">
                      <RaceIcon raceIdentifier={raceId} />
                      {raceName(raceId)}
                    </span>
                  ))}
                </div>
              ) : null}
              <RaceSelect value={race} onChange={setRace} exclude={taken} label="Race" />
              {takesNote ? (
                <Field label="Note" hint="What you want to work on" htmlFor="signup-note">
                  <Input id="signup-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
                </Field>
              ) : null}
              {needsTag ? (
                <Field label="Battle tag" hint="Your w3champions name, as Name#1234" error={tagError} htmlFor="signup-tag">
                  <Input id="signup-tag" aria-invalid={!!tagError} value={battleTag} onChange={(e) => { setBattleTag(e.target.value); setTagError(null); }} />
                </Field>
              ) : null}
            </>
          ) : koth ? (
            <div className="flex items-start gap-2">
              <Icon name={placed ? "mdi-check" : "mdi-clock-outline"} className={placed ? "text-success" : "text-info"} />
              <div className="flex flex-col gap-1">
                {placed ? (
                  <p>
                    {bracket
                      ? `You are in ${bracket}${place?.placeWord ? `, ${place.placeWord} in line` : ""}.`
                      : "You are in. See you on the ladder."}
                  </p>
                ) : (
                  <>
                    <p>You are signed up.</p>
                    <p>W3Champions gave us no rating for {tag} yet, so an admin places you in a bracket.</p>
                  </>
                )}
                {/* one line under a sentence, so a guest with no country leaves no flag gap */}
                {entrant.user ? (
                  <PlayerName player={entrant.user} race={entrant.race} mmr={entrant.mmr ?? false} warning={placed ? undefined : noStats} plain noFlag />
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <p>You are in. See you on the ladder.</p>
              {warnings.length ? (
                <div className="flex flex-wrap gap-2">
                  {warnings.map((code) => (
                    <Badge key={code} className={toneClass("warning")}>
                      <Icon name="mdi-alert-outline" />
                      {warningLabel(code, event)}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {warnings.length ? <p className="text-xs text-muted-foreground">An admin reads these before the draw. Your signup stands.</p> : null}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 pt-0">
          {!entrant ? (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          ) : null}
          <Button disabled={saving || (!entrant && !ready)} onClick={() => (entrant ? onOpenChange(false) : submit())}>
            {saving ? <Icon name="mdi-loading mdi-spin" /> : null}
            {entrant ? "Done" : another ? "Enter" : "Sign up"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SignupDialog;
