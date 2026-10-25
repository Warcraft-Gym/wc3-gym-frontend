"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/Combobox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { StatusAlert } from "@/components/StatusAlert";
import { useEventStore, usePlayerStore } from "@/stores";
import { askAboutAnnouncements } from "@/components/AnnouncementPrompt";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

type Props = {
  event: Row; // the cup: its id, its name and its team size
  mode?: "signup" | "invite";
  teamId?: number | null; // the team an invite goes to
  taken?: number[];
  userId?: number | null; // the caller, who captains the team and is never picked
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => Promise<void> | void;
};

/** Sign a team up for a team cup, or invite one more player into it. The caller captains a team
 *  they sign up, and every player they pick gets an invitation that they accept. The event page's
 *  team panel and the Home's upcoming events open the same dialog. `taken` names the players who
 *  stand in a team of the cup already, so the picker leaves them out; the cup refuses them anyway. */
export function TeamSignupDialog(props: Props) {
  // the body mounts with each opening, so every opening starts empty
  return props.open ? <TeamSignupBody {...props} /> : null;
}

function TeamSignupBody({
  event,
  mode = "signup",
  teamId = null,
  taken = [],
  userId = null,
  onOpenChange,
  onDone,
}: Props) {
  const store = useEventStore();
  const playerStore = usePlayerStore();
  const size: number = Number(event?.team_size) || 2;
  const [roster, setRoster] = useState<Row[]>([]);
  const [name, setName] = useState("");
  // a signup picks the rest of the team, an invite one player
  const [picked, setPicked] = useState<string[]>(() => (mode === "signup" ? Array(Math.max(0, size - 1)).fill("") : [""]));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    playerStore
      .fetchPlayers()
      .then(setRoster)
      .catch((e: Error) => setError(e.message || "The players did not load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const out = new Set<number>([...(userId != null ? [userId] : []), ...taken]);
  const itemsFor = (index: number) =>
    roster
      .filter((player) => !out.has(player.id) && !picked.some((id, at) => at !== index && id === String(player.id)))
      .map((player) => ({ value: String(player.id), title: player.name as string, tag: player.battleTag || "" }));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        await store.signUpTeam(event.id, name.trim(), picked.map(Number));
        askAboutAnnouncements();
      }
      else await store.inviteToTeam(event.id, Number(teamId), Number(picked[0]));
      onOpenChange(false);
      await onDone();
    } catch (e) {
      setError((e as Error).message || "That did not go through");
    } finally {
      setBusy(false);
    }
  };

  const signup = mode === "signup";
  return (
    <Dialog open onOpenChange={(value) => !value && onOpenChange(false)}>
      <DialogContent size="sm" className="gap-0 p-0">
        <DialogTitle className="banner bg-banner px-4 py-3 text-primary">{signup ? "Sign up a team" : "Invite a player"}</DialogTitle>
        <div className="flex flex-col gap-3 p-4">
          {signup && event?.name ? (
            <p className="text-sm text-muted-foreground">
              {event.name} · {size}v{size}
            </p>
          ) : null}
          <StatusAlert modelValue={error} onClose={() => setError(null)} />
          {signup ? (
            <Field label="Team name" htmlFor="team-name">
              <Input id="team-name" maxLength={50} value={name} autoFocus onChange={(e) => setName(e.target.value)} />
            </Field>
          ) : null}
          {picked.map((value, index) => (
            <Field key={index} label={picked.length > 1 ? `Player ${index + 2}` : "Player"} htmlFor={`team-player-${index}`}>
              <Combobox
                id={`team-player-${index}`}
                label="Pick a player"
                items={itemsFor(index)}
                value={value || null}
                onChange={(next) => setPicked(picked.map((one, at) => (at === index ? next ?? "" : one)))}
                row={(item) => (
                  <span className="flex flex-col text-left">
                    <span>{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.tag}</span>
                  </span>
                )}
              />
            </Field>
          ))}
          <p className="text-sm text-muted-foreground">
            {signup
              ? "You captain the team. Each player you pick gets an invitation and joins once they accept; the cup checks every player's rating."
              : "The player joins once they accept."}
          </p>
        </div>
        <div className="flex justify-end gap-2 p-4 pt-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button disabled={busy || picked.some((id) => !id) || (signup && !name.trim())} onClick={save}>
            {busy ? <Icon name="mdi-loading mdi-spin" /> : null}
            {signup ? "Sign up" : "Invite"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TeamSignupDialog;
