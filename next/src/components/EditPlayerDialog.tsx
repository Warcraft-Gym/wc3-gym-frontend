"use client";
import { useImperativeHandle, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/Combobox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { CountrySelect } from "@/components/CountrySelect";
import { RaceIcon } from "@/components/RaceIcon";
import { RaceSelect } from "@/components/RaceSelect";
import { StatusAlert } from "@/components/StatusAlert";
import type { Player } from "@/components/PlayerName";
import { backendUrl, fetchWrapper } from "@/helpers";
import { channelInput } from "@/helpers/casts.mjs";
import { authBox, usePlayerStore } from "@/stores";

const timezones = Intl.supportedValuesOf("timeZone").map((zone) => ({ value: zone, title: zone }));

type SignupSeason = { id: number; name: string; signup_race?: string | null };
// channelInput answers the stored URL, and the reason when the text names no channel
type Channel = { url: string | null; error?: string };

export type EditPlayerDialogHandle = { open: (player: Player) => void };

/** The one form that edits a player row. The caller opens it through its ref and hands in
 *  the row; `refresh` is awaited after a save, so the dialog closes once the list is fresh. */
export function EditPlayerDialog({
  self = false,
  canSave = true,
  refresh = null,
  ref,
}: {
  self?: boolean; // the player editing his own row: fewer fields, and his own route
  canSave?: boolean;
  refresh?: (() => Promise<void> | void) | null;
  ref?: React.Ref<EditPlayerDialogHandle>;
}) {
  const playerStore = usePlayerStore();

  const [show, setShow] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    open: (player: Player) => {
      setSelectedPlayer({ ...player });
      setUpdateError("");
      setShow(true);
    },
  }));

  const edit = (key: string, value: unknown) => setSelectedPlayer((player) => (player ? { ...player, [key]: value } : player));

  // Newest season first; signups are managed on the draft page
  const signupSeasons: SignupSeason[] = (selectedPlayer?.signup_seasons ?? []).slice().sort((a: SignupSeason, b: SignupSeason) => b.id - a.id);

  // The stored channel is the URL the field normalised, so the admin saves what the profile shows
  const twitchChannel: Channel = channelInput("twitch", selectedPlayer?.twitch_url);
  const youtubeChannel: Channel = channelInput("youtube", selectedPlayer?.youtube_url);

  const cancelEdit = () => {
    setShow(false);
    setSelectedPlayer(null);
    setUpdateError(null);
  };

  const updatePlayer = async () => {
    setUpdateError("");
    const edited: Player = { ...selectedPlayer, twitch_url: twitchChannel.url, youtube_url: youtubeChannel.url };
    try {
      if (self) {
        const { name, battleTag, race, country, timezone, twitch_url, youtube_url } = edited;
        const { user } = await fetchWrapper.put(`${backendUrl}/user-info`, { name, battleTag, race, country, timezone, twitch_url, youtube_url });
        // the cast dialog reads the channels off the session payload, which loads once per visit
        const me = authBox.get().me;
        if (me?.user) authBox.set({ ...authBox.get(), me: { ...me, user: { ...me.user, ...user } } });
      } else {
        await playerStore.updatePlayer(edited);
      }
      if (refresh) await refresh();
      cancelEdit();
    } catch (error) {
      console.error("Error updating user:", error);
      setUpdateError("Error updating user: " + (error as Error).message);
    }
  };

  return (
    <Dialog open={show} onOpenChange={(open) => (open ? setShow(true) : cancelEdit())}>
      <DialogContent showCloseButton={false} className="max-w-[800px] gap-0 p-0 sm:max-w-[800px]">
        {selectedPlayer ? (
          <>
            <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
              <Icon name="mdi-pencil" />
              {self ? "Edit profile" : `Edit player: ${selectedPlayer.name}`}
            </DialogTitle>

            <div className="px-4 pt-4">
              <StatusAlert modelValue={updateError} onClose={() => setUpdateError(null)} />
            </div>

            <div className="grid gap-4 p-4 md:grid-cols-2">
              <Field label="Player Name" htmlFor="edit-player-name">
                <Input id="edit-player-name" value={selectedPlayer.name ?? ""} onChange={(event) => edit("name", event.target.value)} />
              </Field>
              <Field label="BattleTag" htmlFor="edit-player-battletag" hint="Checked against W3Champions">
                <Input id="edit-player-battletag" value={selectedPlayer.battleTag ?? ""} onChange={(event) => edit("battleTag", event.target.value)} />
              </Field>

              <CountrySelect value={selectedPlayer.country ?? null} onChange={(value) => edit("country", value)} />

              {self ? (
                <Combobox
                  label="Timezone"
                  items={timezones}
                  value={selectedPlayer.timezone ?? null}
                  onChange={(value) => edit("timezone", value)}
                />
              ) : (
                <Field label="Discord Tag" htmlFor="edit-player-discord-tag">
                  <Input id="edit-player-discord-tag" value={selectedPlayer.discordTag ?? ""} onChange={(event) => edit("discordTag", event.target.value)} />
                </Field>
              )}

              {!self ? (
                <Field label="Discord ID" htmlFor="edit-player-discord-id" hint="Numeric Discord user ID (required)">
                  <Input id="edit-player-discord-id" value={selectedPlayer.discordId ?? ""} onChange={(event) => edit("discordId", event.target.value)} />
                </Field>
              ) : null}

              <div className="md:col-span-2 md:w-[calc(50%-0.5rem)]">
                <RaceSelect value={selectedPlayer.race ?? null} onChange={(value) => edit("race", value)} />
              </div>

              <Field label="Twitch channel" htmlFor="edit-player-twitch" hint="twitch.tv/you" error={twitchChannel.error}>
                <Input id="edit-player-twitch" value={selectedPlayer.twitch_url ?? ""} onChange={(event) => edit("twitch_url", event.target.value)} />
              </Field>
              <Field label="YouTube channel" htmlFor="edit-player-youtube" hint="youtube.com/@you" error={youtubeChannel.error}>
                <Input id="edit-player-youtube" value={selectedPlayer.youtube_url ?? ""} onChange={(event) => edit("youtube_url", event.target.value)} />
              </Field>

              <div className="md:col-span-2">
                <div className="mb-1 text-sm font-medium">Seasons</div>
                {signupSeasons.length ? (
                  <div className="flex flex-wrap gap-1">
                    {signupSeasons.map((season) => (
                      <Badge key={season.id} variant="secondary">
                        {season.signup_race ? <RaceIcon raceIdentifier={season.signup_race} /> : null}
                        {season.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground">Not signed up for a season.</div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 pt-0">
              <Button variant="ghost" onClick={cancelEdit}>
                Cancel
              </Button>
              {canSave ? (
                <Button onClick={updatePlayer} disabled={!!(twitchChannel.error || youtubeChannel.error)}>
                  <Icon name="mdi-content-save" />
                  Save Changes
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default EditPlayerDialog;
