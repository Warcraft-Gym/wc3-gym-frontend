"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, useSeriesStore } from "@/stores";
import { PLATFORM_ICONS, PLATFORM_NAMES, linkAdvice, onNow, platformOf } from "@/helpers/casts.mjs";
import { isUnscored } from "@/helpers/season-phase.mjs";
import { cn } from "@/lib/utils";

const CHANNEL_LABEL = "Channel or stream link";
const CHANNEL_PLACEHOLDER = "twitch.tv/you";
const VIDEO_LABEL = "Video link";
const VIDEO_PLACEHOLDER = "twitch.tv/videos/123456789";
// The title names the action and the button repeats it; neither says "Save" alone
const COPY = {
  claim: { title: "Cast this series", confirm: "Cast series", label: CHANNEL_LABEL, placeholder: CHANNEL_PLACEHOLDER },
  channel: { title: "Change your channel", confirm: "Save channel", label: CHANNEL_LABEL, placeholder: CHANNEL_PLACEHOLDER },
  vod: { title: "Change your VOD", confirm: "Save VOD", label: VIDEO_LABEL, placeholder: VIDEO_PLACEHOLDER },
  addVod: { title: "Add your VOD", confirm: "Add VOD", label: VIDEO_LABEL, placeholder: VIDEO_PLACEHOLDER },
};
// The clock moves the "on now" window, so the chips read it again every minute
const TICK = 60 * 1000;
type Platform = keyof typeof PLATFORM_ICONS;
const iconOf = (url: string | null | undefined, fallback: string) => PLATFORM_ICONS[platformOf(url) as Platform] || fallback;

export type Cast = { id: number; name: string; user_id: number; channel_url: string; vod_url?: string | null };
export type CastSeries = { id: number; casts?: Cast[] | null; date_time?: string | null } & Record<string, any>;

/** Who casts a series: one chip per cast with its platform icon, linking to the channel, or to the VOD
 *  with a play icon; red while the series is on now. A member claims, or adds the VOD once the series is
 *  over; the owner or an admin edits, pastes a VOD or unclaims. */
export function CastChips({ series }: { series: CastSeries }) {
  const auth = useAuth();
  const seriesStore = useSeriesStore();

  // The rows a save answered stand until the caller hands the row over again
  const [saved, setSaved] = useState<Cast[] | null>(null);
  const [handed, setHanded] = useState(series.casts);
  if (handed !== series.casts) {
    setHanded(series.casts);
    setSaved(null);
  }
  const casts = useMemo(() => saved ?? series.casts ?? [], [saved, series.casts]);

  const [live, setLive] = useState(false);
  useEffect(() => {
    const read = () => setLive(onNow({ ...series, casts }));
    read();
    const timer = setInterval(read, TICK);
    return () => clearInterval(timer);
  }, [series, casts]);

  const myId = auth.me?.user?.id;
  // A guest, and a member with no player row, cannot claim
  const canClaim = myId && auth.me?.role !== "guest" && !casts.some((cast) => cast.user_id === myId);
  // A series with a result has nothing left to stream, so it takes a VOD instead of a claim
  const scored = !isUnscored(series);
  const canEdit = (cast: Cast) => auth.isAdmin || cast.user_id === myId;

  // The session's own channels, in the order the profile asks for them
  const myChannels = ([["twitch", auth.me?.user?.twitch_url], ["youtube", auth.me?.user?.youtube_url]] as [Platform, string | null][])
    .filter(([, url]) => url)
    .map(([platform, url]) => ({ platform, url: url as string }));

  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Cast | null>(null); // the cast being edited; null on a claim
  const [field, setField] = useState<"channel" | "vod" | "addVod">("channel");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  // The dialog reads the platform off what is typed, as a phone field reads its prefix
  const platformIcon = iconOf(url, "mdi-link-variant");
  const copy = editing ? COPY[field] : scored ? COPY.addVod : COPY.claim;
  const advice =
    editing && field === "vod" && !url.trim() ? "Leave this blank to remove your VOD." : linkAdvice(url, field !== "channel");

  async function claim() {
    setEditing(null);
    setField(scored ? "addVod" : "channel");
    setError("");
    setUrl(scored ? "" : (await seriesStore.lastCastChannel().catch(() => null)) || "");
    setDialog(true);
  }

  function edit(cast: Cast, which: "channel" | "vod") {
    setEditing(cast);
    setField(which);
    setError("");
    setUrl(cast[which === "vod" ? "vod_url" : "channel_url"] || "");
    setDialog(true);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const { id } = series;
      // A VOD claim streams nothing, so the video page is its channel too
      if (!editing) setSaved(await seriesStore.claimSeries(id, url, scored ? url : null));
      else if (field === "vod") setSaved(await seriesStore.setCastVod(id, editing.id, url.trim() || null));
      else setSaved(await seriesStore.updateCast(id, editing.id, url));
      setDialog(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function unclaim(cast: Cast) {
    await seriesStore.unclaimSeries(series.id, cast.id);
    setSaved(casts.filter((row) => row.id !== cast.id));
  }

  const chipClass = live ? "bg-error text-on-error" : "bg-primary/15 text-primary-text";
  const chipBody = (cast: Cast) => (
    <>
      <Icon name={iconOf(cast.channel_url, "mdi-video")} />
      {cast.name}
      {live ? " · on now" : null}
      {cast.vod_url ? <Icon name="mdi-play" /> : null}
    </>
  );

  return (
    <div className="flex flex-wrap items-center gap-1" onClick={(event) => event.stopPropagation()}>
      {casts.map((cast) =>
        canEdit(cast) ? (
          <DropdownMenu key={cast.id}>
            <DropdownMenuTrigger render={<Badge className={cn("cursor-pointer", chipClass)} />}>{chipBody(cast)}</DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {cast.vod_url ? (
                <DropdownMenuItem render={<a href={cast.vod_url} target="_blank" rel="noopener" />}>
                  <Icon name="mdi-play" />
                  Watch VOD
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem render={<a href={cast.channel_url} target="_blank" rel="noopener" />}>
                <Icon name="mdi-open-in-new" />
                Open channel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => edit(cast, "channel")}>
                <Icon name="mdi-pencil" />
                Change channel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => edit(cast, "vod")}>
                <Icon name="mdi-movie-open" />
                Change VOD
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => unclaim(cast)}>
                <Icon name="mdi-close" />
                Unclaim
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <TapTooltip key={cast.id} content={cast.vod_url || cast.channel_url}>
            <Badge render={<a href={cast.vod_url || cast.channel_url} target="_blank" rel="noopener" />} className={chipClass}>
              {chipBody(cast)}
            </Badge>
          </TapTooltip>
        ),
      )}

      {canClaim ? (
        <Button className="cast-add" size="xs" variant="secondary" onClick={claim}>
          <Icon name={scored ? "mdi-movie-plus" : "mdi-video-plus"} />
          {scored ? "Add your VOD" : "Cast this"}
        </Button>
      ) : !casts.length ? (
        <span className="text-muted-foreground">&mdash;</span>
      ) : null}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent showCloseButton={false} className="max-w-[480px] gap-0 p-0 sm:max-w-[480px]">
          <DialogTitle className="px-6 pt-5 pb-2">{copy.title}</DialogTitle>
          <div className="px-6 pt-2 pb-1">
            {/* A textarea, so a long link wraps and stays readable instead of scrolling out of the field */}
            <Field label={copy.label} htmlFor="cast-url" hint={advice} error={error || null}>
              <div className="flex items-start gap-2">
                <Icon name={platformIcon} className="mt-2 text-muted-foreground" />
                <Textarea
                  id="cast-url"
                  autoFocus
                  rows={1}
                  value={url}
                  placeholder={copy.placeholder}
                  onChange={(event) => setUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      save();
                    }
                  }}
                />
              </div>
            </Field>
            {/* The channels off the profile, one tap each, so a regular caster types nothing */}
            {!editing && field === "channel" && myChannels.length ? (
              <div className="mt-3 flex gap-2">
                {myChannels.map((channel) => (
                  <Button key={channel.platform} size="xs" variant="secondary" onClick={() => setUrl(channel.url)}>
                    <Icon name={PLATFORM_ICONS[channel.platform]} />
                    {PLATFORM_NAMES[channel.platform]}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 px-6 pt-2 pb-4">
            <Button variant="ghost" onClick={() => setDialog(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || (!editing && !url.trim())}>
              {saving ? <Icon name="mdi-loading mdi-spin" /> : null}
              {copy.confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CastChips;
