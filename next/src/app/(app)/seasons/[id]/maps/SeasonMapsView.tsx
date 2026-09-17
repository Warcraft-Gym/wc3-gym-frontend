/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { LadderImportDialog } from "@/components/LadderImportDialog";
import type { ImportRow } from "@/components/LadderImportDialog";
import { StatusAlert } from "@/components/StatusAlert";
import { W3CIcon } from "@/components/W3CIcon";
import { DEFAULT_RULES } from "@/helpers/best-of.mjs";
import { MAP_RULES, titleOf } from "@/helpers/event-labels.mjs";
import { hideMissingImage } from "@/helpers/team-image";
import { useMapStore, useSeason } from "@/stores";

const STEPS = [
  { value: "Ban_A", label: "+ Ban A", color: "text-error" },
  { value: "Ban_B", label: "+ Ban B", color: "text-error" },
  { value: "Pick_A", label: "+ Pick A", color: "text-success" },
  { value: "Pick_B", label: "+ Pick B", color: "text-success" },
];

// The fixed map of a round is cleared by picking this item, which is what `clearable` was
const NO_MAP = "none";

type MapRow = Record<string, any>;
type Round = Record<string, any>;

const Thumb = ({ map, className = "h-[27px] w-10" }: { map: MapRow; className?: string }) => (
  <span className={`block shrink-0 overflow-hidden rounded-[3px] bg-band ${className}`}>
    {map.image ? <img src={map.image} alt={map.name} onError={hideMissingImage} className="block h-full w-full object-cover" /> : null}
  </span>
);

export function SeasonMapsView({ id }: { id: string }) {
  const { current_season: season, seasonIdOf, fetchSeason, updateSeason, addMapsToSeason, removeMapsFromSeason, setSeasonMapOrder, setSeasonRound, fetchLadderMapImport, importLadderMaps } = useSeason();
  const mapStore = useMapStore();

  const seasonId = seasonIdOf(id);
  const [maps, setMaps] = useState<MapRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // The two settings edited here, saved together
  const [rules, setRules] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [savedRules, setSavedRules] = useState("");
  const [savedOrder, setSavedOrder] = useState("");

  const [newMapOpen, setNewMapOpen] = useState(false);
  const [newMap, setNewMap] = useState({ name: "", shortname: "" });
  const [newMapFile, setNewMapFile] = useState<File | null>(null);
  const newMapPreview = newMapFile ? URL.createObjectURL(newMapFile) : null;

  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);

  const pool: MapRow[] = season.maps || [];
  const notInPool = maps.filter((m) => !pool.some((p) => p.id === m.id));
  const usesFixedMap = rules.includes("fixed");
  const rounds: Round[] = season.rounds || [];

  const isDirty = rules.join(",") !== savedRules || order.join("|") !== savedOrder;

  // A game whose rule names its own map takes that map out of the veto
  const vetoPool = pool.length - (usesFixedMap ? 1 : 0);
  const leftOver = vetoPool - order.length;
  // A veto or loser game draws its map from the picks; every map left after the picks may be banned
  const picksMax = rules.filter((rule) => rule === "veto" || rule === "loser").length;
  const bansMax = Math.max(vetoPool - picksMax, 0);
  const bans = order.filter((step) => step.startsWith("Ban")).length;
  const picks = order.length - bans;
  const overLimit = bans > bansMax || picks > picksMax;
  const atLimit = (step: string) => (step.startsWith("Ban") ? bans >= bansMax : picks >= picksMax);
  const counts = [
    { label: "Steps", value: order.length },
    { label: "Bans", value: `${bans} / ${bansMax}`, negative: bans > bansMax },
    { label: "Picks", value: `${picks} / ${picksMax}`, negative: picks > picksMax },
    { label: "Maps in the veto", value: vetoPool },
    { label: "Left over", value: leftOver, negative: leftOver < 0 },
  ];

  // Which outcome of the order fills each game: veto games take the picks in order, then the maps left over
  const pickSides = order.filter((step) => step.startsWith("Pick")).map((step) => step.slice(-1));
  const fills = ((nextPick = 0, usedLeftOver = 0) => rules.map((rule, i) => {
    let source = titleOf(MAP_RULES, rule);
    let short = false;
    if (rule === "veto") {
      if (nextPick < pickSides.length) {
        source = `Pick ${pickSides[nextPick]}`;
        nextPick += 1;
      } else if (usedLeftOver < leftOver) {
        source = "Left over";
        usedLeftOver += 1;
      } else {
        source = "Nothing left";
        short = true;
      }
    } else if (rule === "loser") {
      source = pickSides.length ? "Declared pick" : "Chosen at play time";
    } else if (rule === "host") {
      source = "Chosen at play time";
    }
    return { label: `Game ${i + 1}`, source, short };
  }))();

  const refresh = async () => {
    const [current, list] = await Promise.all([fetchSeason(seasonId!), mapStore.fetchMaps()]);
    setMaps(list || []);
    return current;
  };

  // Run a write, then reread the season; the editors keep whatever is unsaved
  const apply = async (action: () => Promise<unknown>) => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await action();
      await refresh();
    } catch (err) {
      console.error("Season maps action failed", err);
      setErrorMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const addMap = (mapId: number) => apply(() => addMapsToSeason(seasonId!, [mapId]));
  const removeMap = (mapId: number) => apply(() => removeMapsFromSeason(seasonId!, [mapId]));
  const setRound = (playday: number, fields: Round) => apply(() => setSeasonRound(seasonId!, { playday, ...fields }));

  const moveMap = (index: number, step: number) => {
    const ids = pool.map((m) => m.id);
    ids.splice(index + step, 0, ids.splice(index, 1)[0]);
    return apply(() => setSeasonMapOrder(seasonId!, ids));
  };

  const saveSettings = () =>
    apply(async () => {
      await updateSeason({ ...season, map_rules: rules.join(","), pick_ban: order.join("|") });
      setSavedRules(rules.join(","));
      setSavedOrder(order.join("|"));
    });

  const closeNewMap = () => {
    setNewMapOpen(false);
    setNewMap({ name: "", shortname: "" });
    setNewMapFile(null);
  };

  const createNewMap = () =>
    apply(async () => {
      const created = await mapStore.createMap(newMap);
      if (newMapFile) await mapStore.uploadMapImage(created.id, newMapFile);
      await addMapsToSeason(seasonId!, [created.id]);
      closeNewMap();
    });

  const openImport = async () => {
    setImportOpen(true);
    setImportLoading(true);
    setImportRows([]);
    try {
      setImportRows(await fetchLadderMapImport(seasonId!));
    } catch (err) {
      console.error("Failed to read the ladder pool", err);
      setErrorMessage((err as Error).message);
      setImportOpen(false);
    } finally {
      setImportLoading(false);
    }
  };

  const confirmImport = (names: string[]) =>
    apply(async () => {
      await importLadderMaps(seasonId!, names);
      setImportOpen(false);
    });

  // An unsaved page asks before the browser leaves it
  useEffect(() => {
    if (!isDirty) return;
    const ask = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", ask);
    return () => window.removeEventListener("beforeunload", ask);
  }, [isDirty]);

  useEffect(() => {
    if (!seasonId) return;
    // The read runs after the effect body, so the first paint is one render, not a cascade
    queueMicrotask(async () => {
      setIsLoading(true);
      try {
        const current = await refresh();
        const nextRules = (current.map_rules || DEFAULT_RULES).split(",");
        setRules(nextRules);
        setOrder(current.pick_ban ? current.pick_ban.split("|") : []);
        // the default rules are what the page shows, so they are what "saved" compares against
        setSavedRules(nextRules.join(","));
        setSavedOrder(current.pick_ban || "");
      } catch (err) {
        console.error("Failed to load the season maps", err);
        setErrorMessage("Failed to load the season. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId]);

  return (
    <div className="p-4">
      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <Icon name="mdi-loading" size={64} className="animate-spin text-primary" />
        </div>
      ) : null}

      {/* Page Header */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="flex-1">
          <h1>
            <Icon name="mdi-map-outline" className="mr-2" />
            Series Maps
          </h1>
          <div className="text-muted-foreground">{season.name}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" nativeButton={false} render={<Link href={`/seasons/${id}`} />}>
            <Icon name="mdi-arrow-left" />
            Back to season
          </Button>
          <Button disabled={!isDirty || overLimit} onClick={saveSettings}>
            <Icon name="mdi-content-save" />
            Save
          </Button>
        </div>
      </div>

      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />

      <div className="grid gap-4 md:grid-cols-12">
        {/* Map pool */}
        <div className="md:col-span-5">
          <Card className="card gap-0 py-0">
            <CardHeader className="bg-primary p-4">
              <CardTitle className="flex items-center gap-2 text-on-primary">
                <Icon name="mdi-map" />
                <span>Map pool</span>
                <Badge variant="outline" className="ml-auto border-current text-on-primary">
                  {pool.length} maps
                </Badge>
                <Button size="sm" variant="outline" onClick={() => setAddOpen(!addOpen)}>
                  Add map
                </Button>
              </CardTitle>
            </CardHeader>

            {addOpen ? (
              <div className="border-b bg-primary/5">
                <div className="flex items-center px-4 pt-2 text-xs text-muted-foreground">
                  <span>Maps not in this season</span>
                  <span className="ml-auto">{notInPool.length} available</span>
                </div>
                <ul className="max-h-[220px] overflow-y-auto">
                  {notInPool.map((m) => (
                    <li key={m.id}>
                      <button type="button" className="flex w-full items-center gap-3 px-4 py-1.5 text-left hover:bg-muted" onClick={() => addMap(m.id)}>
                        <Thumb map={m} />
                        <span className="flex-1 text-sm">{m.name}</span>
                        <Badge variant="outline" className="rounded-[4px]">
                          {m.shortname}
                        </Badge>
                      </button>
                    </li>
                  ))}
                  {!notInPool.length ? <li className="px-4 py-2 text-xs text-muted-foreground">Every map is already in this season</li> : null}
                </ul>
                <div className="flex justify-end gap-2 px-4 py-2">
                  <Button size="sm" variant="outline" onClick={openImport}>
                    <W3CIcon size={18} />
                    Import W3C map pool
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setNewMapOpen(true)}>
                    New map
                  </Button>
                </div>
              </div>
            ) : null}

            <ul className="py-2">
              {pool.map((m, i) => (
                <li key={m.id} className="flex items-center gap-4 px-4 py-2">
                  <Thumb map={m} className="h-[27px] w-10 md:h-16 md:w-[100px]" />
                  <span className="flex-1 font-medium">{m.name}</span>
                  <Badge variant="outline" className="rounded-[4px]">
                    {m.shortname}
                  </Badge>
                  <Button variant="ghost" size="icon-sm" aria-label="Move up" disabled={i === 0} onClick={() => moveMap(i, -1)}>
                    <Icon name="mdi-arrow-up" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Move down" disabled={i === pool.length - 1} onClick={() => moveMap(i, 1)}>
                    <Icon name="mdi-arrow-down" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Remove" className="text-error" onClick={() => removeMap(m.id)}>
                    <Icon name="mdi-close" />
                  </Button>
                </li>
              ))}
              {!pool.length ? <li className="px-4 py-2 text-muted-foreground">No maps in this season yet</li> : null}
            </ul>
          </Card>
        </div>

        {/* Rules and the fixed map per round */}
        <div className="md:col-span-3">
          <Card className="card mb-4 gap-0 py-0">
            <CardHeader className="bg-primary p-4">
              <CardTitle className="flex items-center gap-2 text-on-primary">
                <Icon name="mdi-format-list-numbered" />
                <span>Map rule per game</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {rules.map((rule, i) => (
                <Field key={i} className="mb-3" label={`Game ${i + 1}`} htmlFor={`rule-${i}`}>
                  <Select value={rule} onValueChange={(value: string | null) => setRules(value === null ? rules : rules.map((old, at) => (at === i ? value : old)))}>
                    <SelectTrigger id={`rule-${i}`} className="w-full">
                      {/* the trigger draws the rule's title, as the item list does */}
                      <SelectValue>{(value: string) => titleOf(MAP_RULES, value)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {MAP_RULES.map((item: { value: string; title: string }) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ))}
            </CardContent>
          </Card>

          <Card className="card gap-0 py-0">
            <CardHeader className="bg-primary p-4">
              <CardTitle className="flex items-center gap-2 text-on-primary">
                <Icon name="mdi-calendar-week" />
                <span>Rounds</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {rounds.map((round) => (
                <div key={round.playday} className="mb-4">
                  <div className="mb-1 font-medium">Round {round.playday}</div>
                  <div className="flex gap-2">
                    <Field className="flex-1" label="Start" htmlFor={`start-${round.playday}`}>
                      <Input
                        id={`start-${round.playday}`}
                        type="date"
                        value={round.start_date ?? ""}
                        onChange={(e) => setRound(round.playday, { start_date: e.target.value || null })}
                      />
                    </Field>
                    <Field className="flex-1" label="End" htmlFor={`end-${round.playday}`}>
                      <Input
                        id={`end-${round.playday}`}
                        type="date"
                        value={round.end_date ?? ""}
                        onChange={(e) => setRound(round.playday, { end_date: e.target.value || null })}
                      />
                    </Field>
                  </div>
                  {usesFixedMap ? (
                    <Field className="mt-2" label="Fixed map" htmlFor={`map-${round.playday}`}>
                      <Select
                        value={round.map_id ?? NO_MAP}
                        onValueChange={(value: number | string) => setRound(round.playday, { map_id: value === NO_MAP ? null : value })}
                      >
                        <SelectTrigger id={`map-${round.playday}`} className="w-full">
                          <SelectValue>{(value: number | string) => pool.find((m) => m.id === value)?.name ?? "No fixed map"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_MAP}>No fixed map</SelectItem>
                          {pool.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              <span className="flex items-center gap-3">
                                <Thumb map={m} />
                                {m.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  ) : null}
                </div>
              ))}
              {!rounds.length ? <div className="text-xs text-muted-foreground">This season has no rounds</div> : null}
            </CardContent>
          </Card>
        </div>

        {/* Pick and ban order */}
        <div className="md:col-span-4">
          <Card className="card mb-4 gap-0 py-0">
            <CardHeader className="bg-primary p-4">
              <CardTitle className="flex items-center gap-2 text-on-primary">
                <Icon name="mdi-gavel" />
                <span>Pick and ban order</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="mb-3 rounded bg-muted px-3 py-2 text-xs leading-relaxed break-words">{order.join("|") || "No order set"}</div>
              <div className="mb-3 flex flex-wrap gap-2">
                {STEPS.map((step) => (
                  <Button key={step.value} size="sm" variant="outline" className={step.color} disabled={atLimit(step.value)} onClick={() => setOrder([...order, step.value])}>
                    {step.label}
                  </Button>
                ))}
                <Button size="sm" variant="outline" disabled={!order.length} onClick={() => setOrder(order.slice(0, -1))}>
                  Delete last
                </Button>
              </div>
              <Separator className="mb-2" />
              {counts.map((count) => (
                <div key={count.label} className="flex justify-between py-1">
                  <span className="text-xs text-muted-foreground">{count.label}</span>
                  <span className={`font-medium tnum ${count.negative ? "text-error" : ""}`}>{count.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="card gap-0 py-0">
            <CardHeader className="bg-primary p-4">
              <CardTitle className="flex items-center gap-2 text-on-primary">
                <Icon name="mdi-help-circle-outline" />
                <span>What fills each game</span>
              </CardTitle>
            </CardHeader>
            <ul className="py-2">
              {fills.map((fill) => (
                <li key={fill.label} className="flex items-center gap-2 px-4 py-1.5">
                  <span className="flex-1 text-sm">{fill.label}</span>
                  <Badge variant="secondary" className={fill.short ? "text-error" : "text-primary"}>
                    {fill.source}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* New Map Dialog */}
      <Dialog open={newMapOpen} onOpenChange={(open) => !open || closeNewMap()}>
        <DialogContent showCloseButton={false} className="max-w-[560px] gap-0 p-0 sm:max-w-[560px]">
          <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
            <Icon name="mdi-map-plus" />
            New map
          </DialogTitle>
          <div className="p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Field className="md:col-span-2" label="Map Name" htmlFor="new-map-name">
                <Input id="new-map-name" value={newMap.name} onChange={(e) => setNewMap({ ...newMap, name: e.target.value })} />
              </Field>
              <Field label="Short Name" htmlFor="new-map-shortname">
                <Input id="new-map-shortname" value={newMap.shortname} onChange={(e) => setNewMap({ ...newMap, shortname: e.target.value })} />
              </Field>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <span className="block h-16 w-[100px] shrink-0 overflow-hidden rounded-[3px] bg-band">
                {newMapPreview ? <img src={newMapPreview} alt="Preview" className="block h-full w-full object-cover" /> : null}
              </span>
              <Field className="flex-1" label="Map Image" htmlFor="new-map-image">
                <Input id="new-map-image" type="file" accept=".png,.jpg" onChange={(e) => setNewMapFile(e.target.files?.[0] ?? null)} />
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-2 p-4 pt-0">
            <Button variant="ghost" onClick={closeNewMap}>
              Cancel
            </Button>
            <Button disabled={!newMap.name} onClick={createNewMap}>
              <Icon name="mdi-plus" />
              Add to pool
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <LadderImportDialog modelValue={importOpen} rows={importRows} loading={importLoading} onUpdateModelValue={setImportOpen} onConfirm={confirmImport} />
    </div>
  );
}

export default SeasonMapsView;
