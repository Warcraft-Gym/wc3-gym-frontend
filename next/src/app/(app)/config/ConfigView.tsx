"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/PageHeader";
import { StatusAlert } from "@/components/StatusAlert";
import { useConfigStore, useSeason } from "@/stores";
import { changedSettings } from "@/helpers/settings-diff.mjs";

type SettingsMap = Record<string, any>;

// Map of setting keys to values
const EMPTY_SETTINGS: SettingsMap = {
  current_w3c_season: "",
  w3c_url: "",
  current_gnl_season: "",
  fantasy_team_creation_enabled: "false",
  fantasy_fixed_bet_points: "false",
  fantasy_bet_points_value: "",
  fantasy_min_bet_points: "",
  fantasy_max_bet_points: "",
  discord_invite_url: "",
  captain_coach_role: "",
  admin_role: "",
  signup_channel_id: "",
  dashboard_channel_id: "",
  scheduling_channel_id: "",
  results_channel_id: "",
  content_channel_id: "",
  fantasy_dashboard_channel_id: "",
};

// The Discord channel and role ids, each with its label, hint and icon
const DISCORD_FIELDS = [
  { key: "discord_invite_url", label: "Discord invite URL", hint: "Offered to a signed-in visitor not in the server", icon: "mdi-link-variant", wide: true },
  { key: "captain_coach_role", label: "Captain/coach role ID", hint: "Discord role ID for team captains and coaches", icon: "mdi-account-star", wide: true },
  { key: "admin_role", label: "Admin role ID", hint: "Discord role ID for bot commands", icon: "mdi-shield-account", wide: true },
  { key: "signup_channel_id", label: "Signup channel ID", hint: "Discord channel for player signup button", icon: "mdi-account-plus", wide: false },
  { key: "dashboard_channel_id", label: "Player profile channel ID", hint: "Discord channel for the player profile button", icon: "mdi-view-dashboard", wide: false },
  { key: "fantasy_dashboard_channel_id", label: "Fantasy dashboard channel ID", hint: "Discord channel for fantasy league dashboard button", icon: "mdi-dice-multiple", wide: false },
  { key: "scheduling_channel_id", label: "Scheduling channel ID", hint: "Where match scheduling notifications are posted", icon: "mdi-calendar-clock", wide: false },
  { key: "results_channel_id", label: "Results channel ID", hint: "Where match results and replays are posted", icon: "mdi-trophy-outline", wide: false },
  { key: "content_channel_id", label: "Content channel ID", hint: "Where cast claims and stream reminders are posted", icon: "mdi-broadcast", wide: false },
];

/** The configuration the backend keeps in the database, plus the Nightbot token KOTH signups carry. */
export function ConfigView() {
  const configStore = useConfigStore();
  const { seasons, fetchSeasons } = useSeason();

  // The page opens on its load, so the overlay is up before the first request goes out
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // KOTH Token management
  const [kothNightbotToken, setKothNightbotToken] = useState("");
  const [kothTokenVisible, setKothTokenVisible] = useState(false);
  const [isGeneratingKothToken, setIsGeneratingKothToken] = useState(false);

  const [settingsMap, setSettingsMap] = useState<SettingsMap>(EMPTY_SETTINGS);
  // What the last successful load held, and null while no load has succeeded
  const [loadedSettings, setLoadedSettings] = useState<SettingsMap | null>(null);
  // What the backend uses while these two fields are blank
  const [w3cConfig, setW3cConfig] = useState<any>(null);

  const setSetting = (key: string, value: any) => setSettingsMap((current) => ({ ...current, [key]: value }));

  // Both loads write this one alert, so the later failure must not hide the earlier
  const addError = (message: string) => setErrorMessage((current) => (current ? current + " " + message : message));

  // Read the stored rows into the form. The overlay and the alert belong to the caller.
  const fetchSettings = useCallback(async () => {
    try {
      const settings = await configStore.fetchSettings();
      // Convert settings array to map
      const next: SettingsMap = { ...EMPTY_SETTINGS };
      settings.forEach((setting: any) => {
        if (!Object.hasOwn(next, setting.key)) return;
        // Convert season settings to number for proper select matching
        if (setting.key === "current_gnl_season" && setting.value) next[setting.key] = parseInt(setting.value, 10);
        // Keep boolean settings as strings "true"/"false" for the switch
        else if (setting.key === "fantasy_team_creation_enabled" || setting.key === "fantasy_fixed_bet_points") next[setting.key] = setting.value || "false";
        else next[setting.key] = setting.value || "";
      });
      setSettingsMap(next);
      setLoadedSettings(next);
      return next;
    } catch (error: any) {
      addError("Failed to load settings: " + error.message);
      return null;
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchW3cConfig = async () => {
      try {
        setW3cConfig(await configStore.fetchW3cConfig());
      } catch {
        setW3cConfig(null);
      }
    };

    // Fetch KOTH Nightbot token
    const fetchKothToken = async () => {
      try {
        const response = await configStore.fetchKothNightbotToken();
        setKothNightbotToken(response.token || "");
      } catch (error) {
        console.error("Failed to fetch KOTH token:", error);
        setKothNightbotToken("");
        addError("Could not read the current token.");
      }
    };

    // The four loads the page opens with
    const load = async () => {
      await Promise.all([fetchSettings(), fetchW3cConfig(), fetchSeasons(), fetchKothToken()]);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const w3cUrlPlaceholder = w3cConfig?.w3c_url ?? "";
  const w3cSeasonPlaceholder = w3cConfig?.current_season == null ? "" : String(w3cConfig.current_season);

  // Save settings
  const saveSettings = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const settingsToSave = changedSettings(loadedSettings, settingsMap);
      if (!Object.keys(settingsToSave).length) {
        setSuccessMessage("Nothing to save.");
        return;
      }
      await configStore.updateSettings(settingsToSave);
      // The config module answers the PUT result only, so the saved rows are read back here
      await fetchSettings();
      setSuccessMessage("Settings saved.");
    } catch (error: any) {
      setErrorMessage("Failed to save settings: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset settings
  const resetSettings = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    await fetchSettings();
    setSuccessMessage(null);
  };

  // Generate new KOTH token
  const generateKothToken = async () => {
    if (!confirm("Are you sure you want to generate a new token? The old token will stop working immediately.")) return;

    setIsGeneratingKothToken(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await configStore.generateKothNightbotToken();
      setKothNightbotToken(response.token);
      setSuccessMessage("Token generated.");
      setKothTokenVisible(true); // Show the new token
    } catch (error: any) {
      setErrorMessage("Failed to generate KOTH token: " + error.message);
    } finally {
      setIsGeneratingKothToken(false);
    }
  };

  // Copy KOTH token to clipboard
  const copyKothToken = async () => {
    try {
      await navigator.clipboard.writeText(kothNightbotToken);
      setSuccessMessage("Token copied.");
    } catch {
      setErrorMessage("Failed to copy token to clipboard");
    }
  };

  // The one-line command an admin pastes into Nightbot, with the live token in it
  const nightbotCommand =
    "!addcom !kothsignup $(urlfetch $(eval const token='" +
    kothNightbotToken +
    "'; const twitch='$(user)'; const race='$(query)'; `https://backend.warcraft-gym.com/koth/signup?token=${token}&twitch=${twitch}&battletag=$(query)${race ? '&race='+race : ''}`; ))";

  return (
    <div className="p-4">
      {/* The page dims while the settings load. */}
      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <span className="size-16 animate-spin rounded-full border-8 border-primary border-t-transparent" />
        </div>
      ) : null}

      <PageHeader title={<><Icon name="mdi-cog" className="mr-2" />Settings</>} />

      {/* Error Message */}
      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />

      {/* Success Message */}
      <StatusAlert modelValue={successMessage} type="success" onClose={() => setSuccessMessage(null)} />

      {/* Application Settings Section */}
      <Card className="card gap-0 py-0">
        <CardHeader className="bg-primary p-4">
          <CardTitle className="flex items-center gap-2 text-on-primary">
            <Icon name="mdi-cog" />
            Application settings
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4">
          <p className="mb-4 text-muted-foreground">Manage application configuration settings stored in the database.</p>

          <div className="grid gap-4 md:grid-cols-12">
            {/* W3Champions Settings */}
            <h3 className="text-xl md:col-span-12">Warcraft 3 Champions integration</h3>

            <Field className="md:col-span-6" label="Current W3C season" hint="Leave blank to follow the latest W3Champions season." htmlFor="current-w3c-season">
              <InputGroup>
                <InputGroupAddon>
                  <Icon name="mdi-trophy" />
                </InputGroupAddon>
                <InputGroupInput
                  id="current-w3c-season"
                  type="number"
                  placeholder={w3cSeasonPlaceholder}
                  value={settingsMap.current_w3c_season}
                  onChange={(event) => setSetting("current_w3c_season", event.target.value)}
                />
              </InputGroup>
            </Field>

            <Field className="md:col-span-6" label="W3Champions API URL" hint="Base URL for W3Champions API. Leave blank to use the default." htmlFor="w3c-url">
              <InputGroup>
                <InputGroupAddon>
                  <Icon name="mdi-api" />
                </InputGroupAddon>
                <InputGroupInput
                  id="w3c-url"
                  placeholder={w3cUrlPlaceholder}
                  value={settingsMap.w3c_url}
                  onChange={(event) => setSetting("w3c_url", event.target.value)}
                />
              </InputGroup>
            </Field>

            {/* GNL Settings */}
            <h3 className="mt-4 text-xl md:col-span-12">GNL league settings</h3>

            <Field className="md:col-span-6" label="Current GNL season" hint="Active league season" htmlFor="current-gnl-season">
              {/* The port of the clearable select: the blank item is how a season is taken back off */}
              <Select
                items={seasons.map((season: any) => ({ value: season.id, label: season.name }))}
                value={settingsMap.current_gnl_season === "" ? null : settingsMap.current_gnl_season}
                onValueChange={(value) => setSetting("current_gnl_season", value ?? "")}
              >
                <SelectTrigger id="current-gnl-season" className="w-full">
                  <Icon name="mdi-calendar" className="text-muted-foreground" />
                  <SelectValue placeholder="Current GNL season" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No season</SelectItem>
                  {seasons.map((season: any) => (
                    <SelectItem key={season.id} value={season.id}>
                      {season.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Public Access Settings */}
            <h3 className="mt-4 text-xl md:col-span-12">Public access settings</h3>

            <div className="md:col-span-6">
              <label className="flex items-center gap-3" htmlFor="fantasy-team-creation">
                <Switch
                  id="fantasy-team-creation"
                  checked={settingsMap.fantasy_team_creation_enabled === "true"}
                  onCheckedChange={(checked) => setSetting("fantasy_team_creation_enabled", checked ? "true" : "false")}
                />
                <span>Fantasy team creation enabled</span>
              </label>
              <p className="mt-1 text-xs text-muted-foreground">Off closes team creation for every season</p>
            </div>

            {/* Fantasy Betting Settings */}
            <h3 className="mt-4 text-xl md:col-span-12">Fantasy betting settings</h3>

            <div className="md:col-span-6">
              <label className="flex items-center gap-3" htmlFor="fantasy-fixed-bet-points">
                <Switch
                  id="fantasy-fixed-bet-points"
                  checked={settingsMap.fantasy_fixed_bet_points === "true"}
                  onCheckedChange={(checked) => setSetting("fantasy_fixed_bet_points", checked ? "true" : "false")}
                />
                <span>Use fixed bet points</span>
              </label>
              <p className="mt-1 text-xs text-muted-foreground">If enabled, all bets use a fixed point value instead of user input</p>
            </div>

            <Field className="md:col-span-6" label="Fixed bet points value" hint="Point value for bets when using fixed bet points" htmlFor="fantasy-bet-points-value">
              <InputGroup>
                <InputGroupAddon>
                  <Icon name="mdi-numeric" />
                </InputGroupAddon>
                <InputGroupInput
                  id="fantasy-bet-points-value"
                  type="number"
                  disabled={settingsMap.fantasy_fixed_bet_points !== "true"}
                  value={settingsMap.fantasy_bet_points_value}
                  onChange={(event) => setSetting("fantasy_bet_points_value", event.target.value)}
                />
              </InputGroup>
            </Field>

            <Field className="md:col-span-6" label="Minimum bet points" hint="Minimum point value allowed when using custom bet points" htmlFor="fantasy-min-bet-points">
              <InputGroup>
                <InputGroupAddon>
                  <Icon name="mdi-arrow-down" />
                </InputGroupAddon>
                <InputGroupInput
                  id="fantasy-min-bet-points"
                  type="number"
                  disabled={settingsMap.fantasy_fixed_bet_points === "true"}
                  value={settingsMap.fantasy_min_bet_points}
                  onChange={(event) => setSetting("fantasy_min_bet_points", event.target.value)}
                />
              </InputGroup>
            </Field>

            <Field className="md:col-span-6" label="Maximum bet points" hint="Maximum point value allowed when using custom bet points" htmlFor="fantasy-max-bet-points">
              <InputGroup>
                <InputGroupAddon>
                  <Icon name="mdi-arrow-up" />
                </InputGroupAddon>
                <InputGroupInput
                  id="fantasy-max-bet-points"
                  type="number"
                  disabled={settingsMap.fantasy_fixed_bet_points === "true"}
                  value={settingsMap.fantasy_max_bet_points}
                  onChange={(event) => setSetting("fantasy_max_bet_points", event.target.value)}
                />
              </InputGroup>
            </Field>

            {/* Discord Settings */}
            <h3 className="mt-4 text-xl md:col-span-12">Discord bot settings</h3>

            {DISCORD_FIELDS.map((field) => (
              <Field key={field.key} className={field.wide ? "md:col-span-6" : "md:col-span-4"} label={field.label} hint={field.hint} htmlFor={field.key}>
                <InputGroup>
                  <InputGroupAddon>
                    <Icon name={field.icon} />
                  </InputGroupAddon>
                  <InputGroupInput id={field.key} value={settingsMap[field.key]} onChange={(event) => setSetting(field.key, event.target.value)} />
                </InputGroup>
              </Field>
            ))}

            {/* KOTH Integration Settings */}
            <h3 className="mt-4 text-xl md:col-span-12">KOTH Nightbot integration</h3>

            <Card className="card p-4 md:col-span-12">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Icon name="mdi-robot" className="text-primary" />
                  <span className="font-medium">Nightbot signup token</span>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">Generate a new token if this one leaks.</p>
              </div>

              <div className="grid items-end gap-4 md:grid-cols-12">
                <Field className="md:col-span-8" label="Current token" hint="Click the eye icon to show/hide the token" htmlFor="koth-token">
                  <InputGroup>
                    <InputGroupAddon>
                      <Icon name="mdi-key" />
                    </InputGroupAddon>
                    <InputGroupInput id="koth-token" readOnly type={kothTokenVisible ? "text" : "password"} value={kothNightbotToken} />
                    <InputGroupAddon align="inline-end">
                      <Button variant="ghost" size="icon-sm" aria-label={kothTokenVisible ? "Hide the token" : "Show the token"} onClick={() => setKothTokenVisible(!kothTokenVisible)}>
                        <Icon name={kothTokenVisible ? "mdi-eye-off" : "mdi-eye"} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Copy the token" disabled={!kothNightbotToken} onClick={copyKothToken}>
                        <Icon name="mdi-content-copy" />
                      </Button>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>

                <div className="md:col-span-4">
                  <Button className="w-full" onClick={generateKothToken} disabled={isGeneratingKothToken}>
                    <Icon name={isGeneratingKothToken ? "mdi-loading mdi-spin" : "mdi-refresh"} />
                    Generate new token
                  </Button>
                </div>

                {kothNightbotToken ? (
                  <div className="md:col-span-12">
                    <div className="alert rounded-md border border-current/20 p-3 text-sm text-info">
                      <strong>Nightbot command example:</strong>
                      <br />
                      <code className="mt-1 inline-block break-all">{nightbotCommand}</code>
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>
          </div>
        </CardContent>

        <div className="flex gap-2 px-4 pb-4">
          <Button onClick={saveSettings} disabled={isSaving || !loadedSettings}>
            <Icon name={isSaving ? "mdi-loading mdi-spin" : "mdi-content-save"} />
            Save settings
          </Button>

          <Button variant="outline" onClick={resetSettings} disabled={isSaving}>
            <Icon name="mdi-reload" />
            Reset
          </Button>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="card mt-4 gap-0 py-0">
        <CardHeader className="bg-primary p-4">
          <CardTitle className="flex items-center gap-2 text-on-primary">
            <Icon name="mdi-information" />
            About settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Database storage:</strong> Settings are stored in the database and persist across backend restarts.</li>
            <li><strong>Public access toggles:</strong> Enable/disable fantasy team creation. Player signups open and close per season on the Seasons page.</li>
            <li><strong>Discord IDs:</strong> Role and channel IDs can be found by enabling Developer Mode in Discord and right-clicking on roles/channels.</li>
            <li><strong>Current GNL season:</strong> The current season is used for public player signups, fantasy team registration, and all league operations.</li>
            <li><strong>W3Champions:</strong> The W3C season and URL are used for fetching player statistics and MMR data.</li>
            <li><strong>Player profile channel:</strong> The channel where the button that opens a player&apos;s own profile is posted.</li>
            <li><strong>Scheduling channel:</strong> Where scheduling notifications are posted when players schedule their matches from their profile.</li>
            <li><strong>Results channel:</strong> Where score update notifications and replay files are posted when players submit results from their profile.</li>
            <li><strong>Fantasy dashboard channel:</strong> The channel where the fantasy league dashboard button is posted.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default ConfigView;
