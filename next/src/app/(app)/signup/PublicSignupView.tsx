"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/Combobox";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Note } from "@/components/ui/Note";
import { CountrySelect } from "@/components/CountrySelect";
import { PageHeader } from "@/components/PageHeader";
import { PlayerName } from "@/components/PlayerName";
import { RaceIcon } from "@/components/RaceIcon";
import { RaceSelect } from "@/components/RaceSelect";
import { discordMark } from "@/assets/discordMark.js";
import { backendUrl, fetchWrapper } from "@/helpers";
import { findCountry } from "@/helpers/countries.js";
import { myProfilePath } from "@/helpers/players.mjs";
import { raceWrapper } from "@/helpers/races.js";
import { isTagError, signupState, signupTitles, startZone } from "@/helpers/signup.mjs";
import { viewerZone, zoneLabel } from "@/helpers/timezone.mjs";
import { useAuth, useSeason } from "@/stores";
import type { Me } from "@/stores";

// What a refused signup carries for an admin who links the earlier player to this login
type SignupLink = { player: string; discord_id: string; battle_tag: string; message: string };

type Season = { id: number; name?: string; signed_up?: boolean; scheduling_enabled?: boolean };

const BATTLE_TAG = /^\S+#\d+$/; // BattleTag format like Name#123456
const raceName = (id: string) => raceWrapper.getRaceObject(id)?.name ?? id;
const filled = (value: string) => !!value && String(value).trim().length > 0;

/** The signup form: a member's player row, and his entry in the season the page acts on. */
export function PublicSignupView() {
  const seasonKey = useSearchParams().get("season");
  const { me, fetchMe } = useAuth();
  const { seasons, seasonIdOf, fetchSeasons } = useSeason();
  const [loading, setLoading] = useState(true);

  // Form fields (match the create player dialog). The Discord session identifies the player,
  // and the linked users row prefills the form.
  const [existing] = useState(() => me?.user);
  const [name, setName] = useState<string>(existing?.name || "");
  const [battleTag, setBattleTag] = useState<string>(existing?.battleTag || "");
  const [tagRefusal, setTagRefusal] = useState("");
  const [link, setLink] = useState<SignupLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  // the browser's region is the default country, e.g. en-US -> US; empty when it names no country
  const [country, setCountry] = useState<string>(() => existing?.country || findCountry(new Intl.Locale(navigator.language || "en").region)?.a2 || "");
  const [race, setRace] = useState<string>(existing?.race || "");
  // the player's own pick or saved zone; empty while the start zone applies
  const [zonePick, setZonePick] = useState<string>(existing?.timezone || "");
  const start = startZone(viewerZone(), country);
  const timezone: string = zonePick || start.zone;
  const zoneWarning =
    zonePick || !start.fallback
      ? ""
      : start.fallback === "country"
        ? `Your browser gave no timezone. This is the main timezone of ${findCountry(country)?.name}. Check it.`
        : "Your browser gave no timezone and no country is chosen. This is UTC. Pick your timezone.";
  // a fallback zone may be an alias the browser list does not carry, e.g. Asia/Kolkata in Chromium
  const timezones = [...new Set([...Intl.supportedValuesOf("timeZone"), timezone])].map((zone) => ({ value: zone, title: zone }));
  // ?season=<slug> names the season on the home card; /me's own season is the fallback
  const selectedSignupSeasonId: number | null = (seasonKey ? seasonIdOf(seasonKey) : null) ?? me?.season_id ?? null;

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [attempted, setAttempted] = useState(false); // a required message reads once the player has tried to submit
  // The backend's answer when the season was not open: the profile is saved, the signup is not
  const [closedMessage, setClosedMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

  const season = seasons.find((x) => String(x.id) === String(selectedSignupSeasonId)) ?? null;
  // /me answers per season, so the signed-up state follows the season the page acts on
  const mySeasonOf = (who: Me): Season | null => who?.seasons?.find((x: Season) => String(x.id) === String(selectedSignupSeasonId)) ?? null;
  const stateOf = (who: Me): string => {
    const mine = mySeasonOf(who);
    return signupState(mine ?? season, !!(mine?.signed_up ?? who?.signed_up), !!who?.user);
  };
  const seasonName = mySeasonOf(me)?.name || season?.name || "";
  const state = stateOf(me);
  const titles = signupTitles(state, seasonName);
  const schedulingEnabled = season?.scheduling_enabled ?? true;
  const entry = me?.user;
  const submitLabel = editing ? "Save my details" : ({ request: "Ask to join", profile: "Save my profile" }[state] ?? "Complete signup");

  // require the session's discord fields and all user-provided fields
  const isFormValid = !!me?.discord_id && !!me?.name && filled(name) && filled(battleTag) && BATTLE_TAG.test(battleTag) && filled(country) && filled(race) && !!timezone;
  // field messages for feedback beside the field
  const battleTagError = !filled(battleTag) ? (attempted ? "BattleTag is required" : null) : BATTLE_TAG.test(battleTag) ? null : "BattleTag must be like Name#123456";
  const required = (value: string, message: string) => (attempted && !filled(value) ? message : null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { await fetchSeasons(); } catch { /* ignore */ }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError("");
    setTagRefusal("");
    setLink(null);
    setCopied(false);
    setCopyFailed(false);
    setSaved(false);
    setAttempted(true);
    // basic client-side validation
    if (!isFormValid) {
      setSubmitError("Please fill all required fields before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        battleTag,
        country,
        race,
        timezone: timezone || undefined,
        season_id: selectedSignupSeasonId ? selectedSignupSeasonId : undefined,
      };
      const created = await fetchWrapper.post(`${backendUrl}/signup`, payload);

      // only a season action can be refused; an edit or a profile-only save is saved whatever the season takes
      if (created?.signup === "closed" && ["signup", "request"].includes(state)) {
        setSuccess(true);
        setClosedMessage(created.message);
        return;
      }
      // the fresh users row and signup turn the page into the signed-up view, which confirms itself
      const fresh = await fetchMe();
      setSaved(editing || stateOf(fresh) !== "joined");
      setEditing(false);
    } catch (err) {
      const e = err as { message?: string; error?: string; link?: Omit<SignupLink, "message"> };
      const message = e?.message || e?.error || String(err);
      if (e?.link) setLink({ ...e.link, message });
      else if (isTagError(message)) setTagRefusal(message);
      else setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      <PageHeader title={<><Icon name="mdi-account-plus" className="mr-2" />{titles.heading}</>} />

      <Card className="gap-0 p-0">
        <CardHeader className="bg-primary p-4">
          <CardTitle className="flex items-center gap-2 text-wrap text-on-primary">
            <Icon name="mdi-clipboard-account" />
            {titles.card}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {loading ? (
            <div>Loading...</div>
          ) : state === "over" ? (
            <>
              <Note className="mb-4">
                <strong>{seasonName} is over.</strong> It takes no signups and no requests.
              </Note>
              <Button nativeButton={false} render={<Link href="/" />}>
                <Icon name="mdi-calendar-star" />
                See upcoming events
              </Button>
            </>
          ) : state === "joined" && !editing ? (
            <>
              <Note type="success" className="mb-4">
                {/* the name and its stop stay one text run, so nothing can break the line between them */}
                <strong>You are signed up</strong> {`for ${seasonName}.`}
              </Note>
              {entry ? (
                <dl className="mb-4 grid grid-cols-[max-content_1fr] items-center gap-x-6 gap-y-2 [&_dd]:flex [&_dd]:items-center [&_dd]:gap-1.5 [&_dt]:text-muted-foreground">
                  <dt>Player</dt>
                  <dd><PlayerName player={entry} /></dd>
                  <dt>BattleTag</dt>
                  <dd>{entry.battleTag}</dd>
                  <dt>Race</dt>
                  <dd><RaceIcon raceIdentifier={entry.race} size="1.2em" />{raceName(entry.race)}</dd>
                  <dt>Timezone</dt>
                  <dd>{zoneLabel(entry.timezone) || "—"}</dd>
                </dl>
              ) : null}
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Icon name="mdi-pencil" />
                Change my details
              </Button>
              {schedulingEnabled ? (
                <Link href={myProfilePath(me)} className="mt-6 flex items-center gap-3 rounded-lg bg-primary/12 p-4 text-primary-text no-underline">
                  <Icon name="mdi-calendar-check" size={24} />
                  <span className="flex-1 font-heading text-base font-medium text-wrap">Check in for each round on your profile</span>
                  <Icon name="mdi-chevron-right" size={24} />
                </Link>
              ) : null}
            </>
          ) : (
            <div>
              {state === "profile" ? (
                <Note className="mb-4">No season is taking signups right now. Your profile is saved for the next one.</Note>
              ) : null}

              {state === "request" ? (
                <Note type="warning" className="mb-4">
                  <strong>Signups for {seasonName} are closed.</strong> Your profile still saves, and an admin may add you. There is no guarantee.
                </Note>
              ) : null}

              <Note className="mb-4">
                Your BattleTag is your{" "}
                <a href="https://w3champions.com/" target="_blank" rel="noopener noreferrer">W3Champions</a>{" "}
                ID, as <code>Name#12345</code>.
              </Note>
              <form noValidate onSubmit={onSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Discord ID" htmlFor="signup-discord-id">
                    <InputGroup>
                      <InputGroupAddon><Icon name="mdi-identifier" /></InputGroupAddon>
                      <InputGroupInput id="signup-discord-id" value={me?.discord_id ?? ""} disabled readOnly required />
                    </InputGroup>
                  </Field>
                  <Field label="Discord Tag" htmlFor="signup-discord-tag">
                    <InputGroup>
                      <InputGroupAddon>
                        <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
                          <path fill="currentColor" d={discordMark} />
                        </svg>
                      </InputGroupAddon>
                      <InputGroupInput id="signup-discord-tag" value={me?.name ?? ""} disabled readOnly required />
                    </InputGroup>
                  </Field>

                  <Field label="Player name (EAShibby)" htmlFor="signup-name" error={required(name, "Player name is required")}>
                    <InputGroup>
                      <InputGroupAddon><Icon name="mdi-account" /></InputGroupAddon>
                      <InputGroupInput id="signup-name" value={name} onChange={(event) => setName(event.target.value)} />
                    </InputGroup>
                  </Field>
                  <Field label="Player BattleTag (EAShibby#12342)" htmlFor="signup-battletag" error={battleTagError || tagRefusal || null}>
                    <InputGroup>
                      <InputGroupAddon><Icon name="mdi-pound" /></InputGroupAddon>
                      <InputGroupInput id="signup-battletag" value={battleTag} required aria-invalid={!!(battleTagError || tagRefusal)} onChange={(event) => { setBattleTag(event.target.value); setTagRefusal(""); }} />
                    </InputGroup>
                  </Field>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div>
                    <CountrySelect value={country || null} onChange={(value) => setCountry(value ?? "")} />
                    <FieldError message={required(country, "Player country is required")} />
                  </div>
                  <div>
                    <RaceSelect label="Main race" value={race || null} onChange={(value) => setRace(value ?? "")} />
                    <FieldError message={required(race, "Main race is required")} />
                  </div>
                  <Combobox label="Timezone" items={timezones} value={timezone} onChange={(zone) => setZonePick(zone || "")} />
                </div>

                {zoneWarning ? (
                  <Note type="warning" className="mt-4">
                    {zoneWarning}
                  </Note>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={submitting || success}>
                    <Icon name={state === "request" ? "mdi-account-question" : "mdi-check"} />
                    {submitLabel}
                  </Button>
                  {editing ? (
                    <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  ) : null}
                  {submitting ? <Icon name="mdi-loading" size={18} className="animate-spin" /> : null}
                </div>
              </form>
              {closedMessage ? (
                <Note type="warning" className="mt-4">
                  {closedMessage}
                </Note>
              ) : null}
              {link ? (
                <Note type="warning" className="mt-4">
                  <strong>{link.message}</strong> Send an admin these two lines on Discord.
                  <pre className="mt-2 whitespace-pre-line rounded bg-surface-bright p-2 font-mono text-sm select-all">{linkLines(link)}</pre>
                  <Button variant="outline" className="mt-2" onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(linkLines(link));
                        setCopied(true);
                      } catch {
                        setCopyFailed(true);
                      }
                    }}>
                    <Icon name={copied ? "mdi-check" : "mdi-content-copy"} />
                    {copied ? "Copied" : "Copy for the admin"}
                  </Button>
                  {copyFailed ? <p className="mt-1.5 text-xs">Copy failed. Select the two lines and copy them.</p> : null}
                </Note>
              ) : null}
              {submitError ? (
                <Note type="error" className="mt-4">
                  Error: {submitError}
                </Note>
              ) : null}
            </div>
          )}
          {saved ? (
            <Note type="success" className="mt-4">
              Your details are saved.
            </Note>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

const linkLines = (link: SignupLink) => `Discord id: ${link.discord_id}\nBattle tag: ${link.battle_tag}`;

const FieldError = ({ message }: { message: string | null }) => (message ? <p className="mt-1.5 text-xs text-error">{message}</p> : null);

export default PublicSignupView;
