/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AchievementIcon } from "@/components/AchievementIcon";
import { StatusAlert } from "@/components/StatusAlert";
import { useSeason } from "@/stores";

const CARDS = [
  { key: "player", title: "Player achievements", icon: "mdi-account-outline", team: false },
  { key: "team", title: "Team achievements", icon: "mdi-account-group-outline", team: true },
];

// Put each rule's current numbers into its description template
const fill = (template: string, params: Record<string, number>) => (template || "").replace(/\{(\w+)\}/g, (whole, key) => String(params?.[key] ?? whole));

type Rule = Record<string, any>;

// What the PUT sends, and what dirty compares
const payload = (list: Rule[]) => list.map((row) => ({ rule_id: row.rule_id, points: Number(row.points) || 0, params: row.params }));
const toRow = (rule: Rule): Rule => ({ ...rule, params: { ...(rule.params || {}) } });

export function SeasonAchievementsView({ id }: { id: string }) {
  const { seasons, seasonIdOf, ensureSeasons, fetchAchievementCatalogue, fetchSeasonAchievements, saveSeasonAchievements } = useSeason();

  const seasonId = seasonIdOf(id);
  const season = seasons.find((s: Rule) => s.id === seasonId);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState<Record<string, boolean>>({});

  const [catalogue, setCatalogue] = useState<Rule[]>([]);
  const [rows, setRows] = useState<Rule[]>([]); // the working list, saved as a whole
  const [baseline, setBaseline] = useState("");

  const isDirty = JSON.stringify(payload(rows)) !== baseline;

  const rowsOf = (team: boolean) => rows.filter((row) => !!row.team === team);
  const notAdded = (team: boolean) => catalogue.filter((rule) => !!rule.team === team && !rows.some((row) => row.rule_id === rule.rule_id));

  const importItems = [
    { title: "Catalogue defaults", value: "catalogue" as string | number },
    ...seasons
      .filter((s: Rule) => s.id !== seasonId)
      .sort((a: Rule, b: Rule) => b.id - a.id)
      .map((s: Rule) => ({ title: s.name, value: s.id as string | number })),
  ];

  const run = async (action: () => Promise<unknown>) => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await action();
    } catch (err) {
      console.error("Season achievements action failed", err);
      setErrorMessage((err as any).error?.message || (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const addRule = (rule: Rule) => setRows((list) => [...list, toRow(rule)]);
  const removeRow = (row: Rule) => setRows((list) => list.filter((one) => one !== row));
  const setRow = (row: Rule, part: Rule) => setRows((list) => list.map((one) => (one === row ? { ...one, ...part } : one)));

  // The select is an action, not a setting: it reads a source and drops back to empty
  const runImport = (source: string | number | null) => {
    if (!source) return;
    if (isDirty && !window.confirm("Replace the unsaved list?")) return;
    return run(async () => {
      const list = source === "catalogue" ? catalogue : await fetchSeasonAchievements(source as number);
      setRows(list.map(toRow));
    });
  };

  const save = () =>
    run(async () => {
      const saved = (await saveSeasonAchievements(seasonId!, payload(rows))).map(toRow);
      setRows(saved);
      setBaseline(JSON.stringify(payload(saved)));
    });

  useEffect(() => {
    if (!seasonId) return;
    // the loaders set state, so they run just outside the effect body (react-hooks/set-state-in-effect)
    queueMicrotask(() => run(async () => {
      await ensureSeasons();
      const [rules, current] = await Promise.all([fetchAchievementCatalogue(), fetchSeasonAchievements(seasonId!)]);
      setCatalogue(rules);
      setRows(current.map(toRow));
      setBaseline(JSON.stringify(payload(current)));
    }));
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
            <Icon name="mdi-trophy-variant-outline" className="mr-2" />
            Season Achievements
          </h1>
          <div className="text-muted-foreground">{season?.name}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" nativeButton={false} render={<Link href={`/seasons/${id}`} />}>
            <Icon name="mdi-arrow-left" />
            Back to season
          </Button>
          <Button disabled={!isDirty} onClick={save}>
            <Icon name="mdi-content-save" />
            Save
          </Button>
        </div>
      </div>

      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />

      <div className="mb-1 flex flex-wrap items-center gap-4">
        <Field className="w-full sm:w-64" label="Import from" htmlFor="import-source">
          <Select value={null} onValueChange={runImport}>
            <SelectTrigger id="import-source" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {importItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex-1 text-xs text-muted-foreground">Imported points come from the source season. Edit them before you save.</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CARDS.map((card) => (
          <Card key={card.key} className="card gap-0 py-0">
            <CardHeader className="bg-primary p-4">
              <CardTitle className="flex items-center gap-2 text-on-primary">
                <Icon name={card.icon} />
                <span className="min-w-0 truncate" title={card.title}>
                  {card.title}
                </span>
                <Badge variant="outline" className="ml-auto shrink-0 border-current text-on-primary">
                  {rowsOf(card.team).length} rules
                </Badge>
                <Button size="sm" variant="outline" onClick={() => setAddOpen({ ...addOpen, [card.key]: !addOpen[card.key] })}>
                  Add
                </Button>
              </CardTitle>
            </CardHeader>

            {addOpen[card.key] ? (
              <div className="border-b bg-primary/5">
                <div className="flex items-center px-4 pt-2 text-xs text-muted-foreground">
                  <span>Rules not in this season</span>
                  <span className="ml-auto">{notAdded(card.team).length} available</span>
                </div>
                <ul className="max-h-[220px] overflow-y-auto">
                  {notAdded(card.team).map((rule) => (
                    <li key={rule.rule_id}>
                      <button type="button" className="flex w-full items-center gap-3 px-4 py-1.5 text-left hover:bg-muted" onClick={() => addRule(rule)}>
                        <AchievementIcon id={rule.rule_id} size={22} />
                        <span className="flex-1 text-sm">{rule.name}</span>
                        <Badge variant="outline" className="rounded-[4px] tnum">
                          {rule.points}
                        </Badge>
                      </button>
                    </li>
                  ))}
                  {!notAdded(card.team).length ? <li className="px-4 py-2 text-xs text-muted-foreground">Every rule is already in this season</li> : null}
                </ul>
              </div>
            ) : null}

            <CardContent className="max-h-[560px] overflow-y-auto p-0 py-2">
              <ul>
                {rowsOf(card.team).map((row) => (
                  // On a phone the number fields sit under the text instead of squeezing it to one character
                  <li key={row.rule_id} className="flex flex-wrap items-start gap-4 px-4 py-2 sm:flex-nowrap">
                    <AchievementIcon id={row.rule_id} size={28} className="mt-1" />
                    <div className="min-w-[8rem] flex-1">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-sm text-muted-foreground">{fill(row.description, row.params)}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Field className="w-[104px]" label="Points" htmlFor={`points-${row.rule_id}`}>
                        <Input
                          id={`points-${row.rule_id}`}
                          type="number"
                          min={0}
                          className="tnum"
                          value={row.points ?? ""}
                          onChange={(e) => setRow(row, { points: e.target.value === "" ? "" : Number(e.target.value) })}
                        />
                      </Field>
                      {Object.keys(row.params).map((key) => (
                        <Field key={key} className="w-[104px]" label={key} htmlFor={`${row.rule_id}-${key}`}>
                          <Input
                            id={`${row.rule_id}-${key}`}
                            type="number"
                            min={1}
                            className="tnum"
                            value={row.params[key] ?? ""}
                            onChange={(e) => setRow(row, { params: { ...row.params, [key]: e.target.value === "" ? "" : Number(e.target.value) } })}
                          />
                        </Field>
                      ))}
                      <Button variant="ghost" size="icon-sm" aria-label="Remove" className="mt-6 text-error" onClick={() => removeRow(row)}>
                        <Icon name="mdi-close" />
                      </Button>
                    </div>
                  </li>
                ))}
                {!rowsOf(card.team).length ? <li className="px-4 py-2 text-muted-foreground">No rules yet. Add one or import a season.</li> : null}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default SeasonAchievementsView;
