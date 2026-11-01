"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Note } from "@/components/ui/Note";
import { Pick } from "@/components/ui/Pick";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { StatusAlert } from "@/components/StatusAlert";
import { MAP_MODES, modesOf, modesText } from "@/helpers/map-modes.mjs";
import { ALL_MODES, missingPicturesNote, modeChoices, playedAs } from "@/helpers/map-sources.mjs";
import { hideMissingImage } from "@/helpers/team-image";
import { useMapStore } from "@/stores";

type Source = { key: string; title: string; credit_url: string; license?: string | null };
export type ImportedMap = { id: number; name: string; shortname?: string | null; image?: string | null };
type SourceRow = {
  name: string;
  players?: number | null;
  modes?: string | null;
  shortname?: string | null;
  picture_url?: string | null;
  map_id?: number | null;
  pictured?: boolean;
};

// the most maps the backend takes in one call, which each copy their picture
const MAPS_PER_CALL = 10;
// the most rows the backend lists for one search
const LIST_ROWS = 500;
const SEARCH_WAIT_MS = 300;

/** An organizer or an admin picks maps from a site and sets what each is played as. Picked rows stay picked across
 *  searches. Mount it to open it, so each opening starts empty. */
export function MapSourceImportDialog({ onClose, onImported }: { onClose: () => void; onImported: (maps: ImportedMap[]) => void | Promise<void> }) {
  const mapStore = useMapStore();
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceKey, setSourceKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState(ALL_MODES);
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, { row: SourceRow; modes: string[] }>>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const source = sources.find((one) => one.key === sourceKey);
  const pickedCount = Object.keys(picked).length;
  const filtered = playedAs(rows, mode);
  // a picked map the search or the filter hides stays in sight, so it can still be changed or dropped
  const shown = [...Object.values(picked).map((one) => one.row).filter((row) => !filtered.some((listed) => listed.name === row.name)), ...filtered];

  // a site that refuses its files to another site's page lists no picture at all
  const showsPictures = shown.some((row) => row.picture_url);

  useEffect(() => {
    let alive = true;
    mapStore
      .fetchMapSources()
      .then((list: Source[]) => {
        if (!alive) return;
        setSources(list);
        setSourceKey(list[0]?.key ?? null);
      })
      .catch((e: Error) => {
        if (!alive) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [mapStore]);

  useEffect(() => {
    if (!sourceKey) return;
    let alive = true;
    const timer = setTimeout(
      async () => {
        setLoading(true);
        setError(null);
        try {
          const found = await mapStore.fetchSourceMaps(sourceKey, search.trim());
          if (alive) setRows(found);
        } catch {
          if (!alive) return;
          setRows([]);
          setError("This site could not be read right now. Try another site, or try again later.");
        } finally {
          if (alive) setLoading(false);
        }
      },
      search ? SEARCH_WAIT_MS : 0,
    );
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [mapStore, sourceKey, search]);

  // a site's names mean nothing on another site, so a new site starts with nothing picked
  const pickSource = (key: string | null) => {
    setSourceKey(key);
    setSearch("");
    setMode(ALL_MODES);
    setRows([]);
    setPicked({});
  };

  const togglePick = (row: SourceRow) =>
    setPicked(({ [row.name]: was, ...rest }) => (was ? rest : { ...rest, [row.name]: { row, modes: modesOf(row.modes) } }));

  const setModes = (name: string, modes: string[]) => setPicked((all) => ({ ...all, [name]: { ...all[name], modes } }));

  const runImport = async () => {
    const entries = Object.entries(picked).map(([name, { modes }]) => ({ name, modes: modesText(modes) }));
    const imported: ImportedMap[] = [];
    setError(null);
    setNote(null);
    setProgress({ done: 0, total: entries.length });
    try {
      for (let done = 0; done < entries.length; done += MAPS_PER_CALL) {
        const chunk = entries.slice(done, done + MAPS_PER_CALL);
        imported.push(...(await mapStore.importSourceMaps(sourceKey!, chunk)));
        setProgress({ done: done + chunk.length, total: entries.length });
        // what is in stays out of a retry
        setPicked((all) => Object.fromEntries(Object.entries(all).filter(([name]) => !chunk.some((one) => one.name === name))));
      }
      await onImported(imported);
      // a map left without a picture is said here, or it is only found later on its own page
      const missing = missingPicturesNote(imported);
      if (missing) setNote(missing);
      else onClose();
    } catch (e) {
      setError((e as Error).message);
      await onImported(imported);
    } finally {
      setProgress(null);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => open || progress || onClose()}>
      <DialogContent showCloseButton={false} size="lg" className="flex flex-col gap-0 overflow-hidden p-0">
        <DialogTitle className="flex items-center gap-2 banner bg-banner px-4 py-3 text-primary">
          <Icon name="mdi-download" />
          <span>Import maps from a site</span>
        </DialogTitle>
        {progress ? <Progress value={(progress.done / progress.total) * 100} /> : loading ? <Progress value={null} /> : null}

        <StatusAlert modelValue={error} className="mx-4 my-2 w-auto" onClose={() => setError(null)} />
        {note ? (
          <Note type="warning" className="mx-4 mt-3 w-auto">
            {note}
          </Note>
        ) : null}

        <div className="flex flex-wrap items-end gap-2 p-4">
          <Pick className="min-w-[180px] flex-1" label="Site" items={sources.map((one) => ({ value: one.key, title: one.title }))} value={sourceKey} onChange={pickSource} />
          <Pick className="min-w-[120px] flex-1" label="Played as" items={modeChoices(rows, mode)} value={mode} onChange={(next) => setMode(next ?? ALL_MODES)} />
          <Field className="min-w-[200px] flex-[2_1_200px]" label="Search" htmlFor="source-search">
            <Input id="source-search" value={search} placeholder="Name of a map" onChange={(e) => setSearch(e.target.value)} />
          </Field>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto">
          {shown.map((row) => {
            const pick = picked[row.name];
            return (
              <li key={row.name} className="px-4 py-2">
                <label className="flex cursor-pointer items-center gap-3">
                  <Checkbox checked={!!pick} onCheckedChange={() => togglePick(row)} />
                  {showsPictures ? (
                    <span className="block h-[27px] w-10 shrink-0 overflow-hidden rounded-[3px] bg-band">
                      {row.picture_url ? <img src={row.picture_url} alt="" loading="lazy" onError={hideMissingImage} className="block h-full w-full object-cover" /> : null}
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1 text-sm font-medium">{row.name}</span>
                  {row.players ? <span className="shrink-0 text-xs text-muted-foreground">{row.players} players</span> : null}
                  {row.map_id != null ? <Badge variant="secondary">{row.pictured ? "In the app" : "In the app, no picture"}</Badge> : null}
                </label>
                {pick ? (
                  <ToggleGroup
                    multiple
                    variant="outline"
                    spacing={0}
                    className="mt-2 flex-wrap pl-7"
                    aria-label={`${row.name} is played as`}
                    value={pick.modes}
                    onValueChange={(value) => setModes(row.name, value as string[])}
                  >
                    {MAP_MODES.map((mode) => (
                      <ToggleGroupItem key={mode.value} value={mode.value} className="min-h-9 px-3 aria-pressed:bg-primary/15 aria-pressed:text-primary-text">
                        {mode.title}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                ) : null}
              </li>
            );
          })}
          {!shown.length && !loading && !error ? <li className="px-4 py-6 text-center text-sm text-muted-foreground">No maps match that search.</li> : null}
        </ul>
        {rows.length >= LIST_ROWS ? <p className="px-4 pt-2 text-xs text-muted-foreground">Showing the first {LIST_ROWS} maps. Search to find the rest.</p> : null}
        {shown.length && !showsPictures ? <p className="px-4 pt-2 text-xs text-muted-foreground">This site&apos;s pictures come in with the import.</p> : null}

        <div className="flex flex-wrap items-center justify-end gap-2 p-4">
          {source ? (
            <p className="mr-auto text-xs text-muted-foreground">
              Maps from{" "}
              <a href={source.credit_url} target="_blank" rel="noreferrer" className="underline">
                {source.title}
              </a>
              {source.license ? `, ${source.license}` : ""}
            </p>
          ) : null}
          <Button variant="ghost" disabled={!!progress} onClick={onClose}>
            {note ? "Close" : "Cancel"}
          </Button>
          <Button disabled={!pickedCount || !!progress} onClick={runImport}>
            <Icon name={progress ? "mdi-loading mdi-spin" : "mdi-plus"} />
            {progress ? `Importing ${progress.done} of ${progress.total}` : `Import ${pickedCount} ${pickedCount === 1 ? "map" : "maps"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MapSourceImportDialog;
