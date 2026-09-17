"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { SortingState } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { PageHeader } from "@/components/PageHeader";
import { RowActions } from "@/components/RowActions";
import type { RowAction } from "@/components/RowActions";
import { StatusAlert } from "@/components/StatusAlert";
import { useConfigStore, useSeason, useTeamStore } from "@/stores";
import { discordMark } from "@/assets/discordMark.js";
import { teamImageUrl, showDefaultTeamImage } from "@/helpers/team-image";
import { resolveCurrentSeasonId } from "@/helpers/current-season";
import { cn } from "@/lib/utils";

type Role = { id: string; name: string; color?: string | null; members: number; manageable: boolean; hidden?: boolean };
type Binding = { id: number; discord_role: string; kind: string; team_id: number | null; scope: string; season_id: number | null; synced: boolean; holders: number };
type Group = { kind: string; team_id?: number | null; label: string; count: number };
type ReportRow = { user_id: number; name: string; discord_id: string; missing: string[]; extra: string[] };
type RoleCard = Role & { named: boolean; binding?: Binding; handManaged: boolean; state: string; dot: string; groupLabel: string | null; groupTeam: any };
type Picker = {
  roleName: string;
  discord_role: string;
  bindingId: number | null;
  column: string;
  kind: string | null;
  team_id: number | null;
  seasonId: number | null;
  scope: string | null;
};

// Discord lets a bot change only the roles listed below its own role
const ABOVE_BOT = "Listed above the bot's role in Discord, so the bot cannot grant or remove it.";
const COLUMNS = [
  { key: "managed", label: "Managed", icon: "mdi-sync", subtitle: "Sync grants and removes these roles.", empty: "Drag a role here to have Sync grant and remove it." },
  { key: "ignored", label: "Ignored", icon: "mdi-hand-back-right", subtitle: "Bound, but a person applies them in Discord by hand.", empty: "Bound roles Sync leaves alone." },
  { key: "notBound", label: "Not bound", icon: "mdi-link-variant-off", subtitle: "Never touched. Bind one, or hide it.", empty: "Every server role is bound." },
];
// The scopes each kind offers, the first one the default for a new binding
const SCOPES: Record<string, string[]> = {
  team: ["all", "current", "season"],
  captain: ["all", "current", "season"],
  gnl_participant: ["current", "season", "all"],
  fantasy: ["current", "season", "all"],
  champion: ["season"],
  admin: ["current"],
};
const KIND_LABEL: Record<string, string> = { team: "Team", captain: "Captains", gnl_participant: "Players", fantasy: "Fantasy Captains", champion: "Champions", admin: "Gym Admin" };
const SORTS = [
  { key: "discord", label: "Discord order" },
  { key: "name", label: "Name" },
  { key: "holders", label: "In app" },
  { key: "members", label: "In Discord" },
  { key: "groupLabel", label: "Bound to" },
];
const STATE_ORDER = ["managed", "ignored", "notBound", "hidden", "locked"];
const STATE_LABEL: Record<string, string> = { notBound: "Not bound", hidden: "Hidden", locked: "Above the bot" };

/** The card that says why the bot cannot touch a role. */
function LockedHint({ locked, className, children, ...rest }: { locked: boolean; className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  const body = (
    <div className={cn(locked && "cursor-not-allowed opacity-50", className)} {...rest}>
      {children}
    </div>
  );
  if (!locked) return body;
  return (
    <Tooltip>
      <TooltipTrigger render={body} />
      <TooltipContent>{ABOVE_BOT}</TooltipContent>
    </Tooltip>
  );
}

/** Every Discord role beside the group of people the app binds it to, and the accounts whose roles
 *  do not match the database yet. */
export function DiscordRolesView() {
  const configStore = useConfigStore();
  const teamStore = useTeamStore();
  const { seasons, fetchSeasons } = useSeason();

  // Which of the two layouts an admin last chose, while both ship. Server and first paint draw the
  // columns, so the stored choice is read only once the page is hydrated.
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [chosenView, setChosenView] = useState<string | null>(null);
  const view = chosenView ?? (hydrated ? (localStorage.getItem("discordRolesView") ?? "columns") : "columns");
  const [sortKey, setSortKey] = useState("discord");

  const [guildRoles, setGuildRoles] = useState<Role[]>([]);
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [report, setReport] = useState<ReportRow[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  // The page opens on its load, so both tables are busy before the first request goes out
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(true);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingUserId, setSyncingUserId] = useState<number | null>(null);
  const [applyingRoleId, setApplyingRoleId] = useState<string | null>(null);
  const [isSavingBinding, setIsSavingBinding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // True while any load failed, so no empty list reads as an all-clear
  const [loadFailed, setLoadFailed] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [pickerDialog, setPickerDialog] = useState(false);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [currentSeasonId, setCurrentSeasonId] = useState<number | null>(null);
  // The season groups the picker has open, and the teams of each opened season: null while loading, kept for the dialog's life
  const [openedSeasons, setOpenedSeasons] = useState<number[]>([]);
  const [seasonTeams, setSeasonTeams] = useState<Record<number, any[] | null>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteBinding, setDeleteBinding] = useState<Binding | null>(null);
  const [dragRoleId, setDragRoleId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  // The table opens on the Sync column, in the order STATE_ORDER names
  const [tableSorting, setTableSorting] = useState<SortingState>([{ id: "state", desc: false }]);

  const isSyncing = isSyncingAll || syncingUserId !== null;

  const seasonName = (id: number | null) => seasons.find((s: any) => s.id === id)?.name ?? `Season ${id}`;
  const teamById = (id: number | null) => teams.find((t) => t.id === id);
  const teamName = (id: number | null) => {
    const team = teamById(id);
    return team ? team.long_name || team.name : `Team ${id}`;
  };
  const guildRole = (id: string) => guildRoles.find((r) => r.id === id);
  const bindingFor = (id: string) => bindings.find((b) => b.discord_role === id);
  const roleName = (id: string) => guildRole(id)?.name ?? id;
  const roleDot = (role: { color?: string | null }) =>
    role.color ? (role.color.startsWith("#") ? role.color : `#${role.color}`) : "rgba(var(--v-theme-on-surface), var(--v-disabled-opacity))";
  // Within one season a group is unique by kind and team, so a binding that follows the current season still matches
  const groupKey = (group: { kind: string | null; team_id?: number | null }) => `${group.kind}:${group.team_id ?? ""}`;

  const scopeOptions = SCOPES[picker?.kind ?? ""] ?? [];
  // The scope and season the group counts follow: what the control under the list names, the current season before a kind is picked
  const scopeOf = (row: Picker | null) => row?.scope ?? "current";
  const seasonIdOf = (row: Picker | null) => row?.seasonId ?? currentSeasonId;
  const listScope = scopeOf(picker);
  const listSeasonId = seasonIdOf(picker);
  const listScopeLabel = listScope === "season" ? seasonName(listSeasonId) : listScope === "all" ? "All seasons" : `Current season (${seasonName(currentSeasonId)})`;
  // One sentence for the picked scope; an admin binding is hand-managed and names no season
  const scopeCaption =
    picker?.kind === "admin"
      ? "Follows the current season."
      : listScope === "season"
        ? `Holders keep the role after ${seasonName(listSeasonId)} ends.`
        : listScope === "all"
          ? "Anyone who ever earned it keeps the role."
          : "When the next season becomes current, Apply or Sync all grants it to the new holders and removes it from last season's.";

  const seasonGroups = groups.filter((g) => g.kind !== "team");
  const seasonsNewestFirst = [...seasons].sort((a: any, b: any) => b.id - a.id);
  // The holder count of each team group, so a team with no group row shows 0
  const teamCounts: Record<number, number> = Object.fromEntries(groups.filter((g) => g.kind === "team").map((g) => [g.team_id, g.count]));

  const scopeWords = (row: Binding) => (row.scope === "season" ? seasonName(row.season_id) : row.scope === "all" ? "all seasons" : "current season");

  // The line naming the people a binding covers
  const groupLabel = (row: Binding) => {
    if (row.kind === "admin") return "Hand-managed in Discord";
    if (row.kind === "team") return `${teamName(row.team_id)} · ${scopeWords(row)}`;
    if (row.kind === "champion") {
      const winner = row.team_id ? ` (winner: ${teamName(row.team_id)})` : "";
      return `Champions · ${scopeWords(row)}${winner}`;
    }
    return `${KIND_LABEL[row.kind] ?? row.kind} · ${scopeWords(row)}`;
  };

  // One card per Discord role, plus a card for a binding whose role the guild no longer names
  const allCards: RoleCard[] = useMemo(() => {
    const known = guildRoles.map((role) => ({ ...role, named: true }));
    const unnamed: (Role & { named: boolean })[] = bindings
      .filter((b) => !guildRoles.find((r) => r.id === b.discord_role))
      .map((b) => ({ id: b.discord_role, name: b.discord_role, color: null, members: 0, manageable: true, named: false }));
    return [...known, ...unnamed].map((role) => {
      const binding = bindings.find((b) => b.discord_role === role.id);
      return {
        ...role,
        binding,
        handManaged: binding?.kind === "admin",
        state: binding ? (binding.synced ? "managed" : "ignored") : role.hidden ? "hidden" : role.manageable ? "notBound" : "locked",
        dot: roleDot(role),
        groupLabel: binding ? groupLabel(binding) : null,
        groupTeam: binding?.kind === "team" ? (teams.find((t) => t.id === binding.team_id) ?? binding.team_id) : null,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildRoles, bindings, teams, seasons]);

  const columnOf = (card: RoleCard) => card.state;

  // The picked sort: numbers largest first, names A to Z, the guild's own order untouched
  const cards: Record<string, RoleCard[]> = useMemo(() => {
    const sorted = (list: RoleCard[]) => {
      if (sortKey === "discord") return list;
      const of = (c: RoleCard): any => (sortKey === "holders" ? (c.binding?.holders ?? -1) : sortKey === "groupLabel" ? (c.groupLabel ?? "") : (c as any)[sortKey]);
      return [...list].sort((a, b) => (typeof of(a) === "number" ? of(b) - of(a) : String(of(a)).localeCompare(String(of(b)))));
    };
    return {
      managed: sorted(allCards.filter((c) => c.state === "managed")),
      ignored: sorted(allCards.filter((c) => c.state === "ignored")),
      notBound: sorted(allCards.filter((c) => c.state === "notBound")),
    };
  }, [allCards, sortKey]);

  // The roles an admin hid, and the unbound ones above the bot that it could never manage, listed under Not bound
  const hiddenRoles = guildRoles.filter((r) => r.hidden || (!r.manageable && !bindingFor(r.id)));

  const addError = (message: string) => {
    setLoadFailed(true);
    setErrorMessage((current) => (current ? current + " " + message : message));
  };

  const fetchReport = useCallback(async (again = true) => {
    if (again) setIsLoadingReport(true);
    try {
      const rows = await configStore.fetchDiscordRoleReport();
      setReport(rows);
      return rows as ReportRow[];
    } catch (error: any) {
      addError("Failed to load the out-of-sync accounts: " + error.message);
      return [] as ReportRow[];
    } finally {
      setIsLoadingReport(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      // The report reads the guild, so the cards render before it lands
      const pending = fetchReport(false);
      try {
        const [bindingRows, teamRows, roleRows] = await Promise.all([
          configStore.fetchDiscordRoleBindings(),
          teamStore.getTeamsBasic(),
          configStore.fetchDiscordGuildRoles(),
          fetchSeasons(),
        ]);
        setBindings(bindingRows);
        setTeams(teamRows);
        setGuildRoles(roleRows);
      } catch (error: any) {
        addError("Failed to load the Discord roles: " + error.message);
      } finally {
        setIsLoading(false);
      }
      await pending;
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseView = (next: string) => {
    setChosenView(next);
    localStorage.setItem("discordRolesView", next);
  };

  const syncAll = async () => {
    setIsSyncingAll(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      // The answer is the difference sync just applied, so the table is read again
      const applied = await configStore.syncDiscordRoles();
      const rows = await fetchReport();
      setSuccessMessage(`Synced ${applied.length} account(s). ${rows.length} still differ.`);
    } catch (error: any) {
      setErrorMessage("Failed to sync the roles: " + error.message);
    } finally {
      setIsSyncingAll(false);
    }
  };

  const syncOne = async (row: ReportRow) => {
    setSyncingUserId(row.user_id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await configStore.syncDiscordRoles({ user_ids: [row.user_id] });
      await fetchReport();
      setSuccessMessage(`Synced ${row.name}.`);
    } catch (error: any) {
      setErrorMessage(`Failed to sync ${row.name}: ` + error.message);
    } finally {
      setSyncingUserId(null);
    }
  };

  // Apply grants and removes one role at a time
  const applyRole = async (card: RoleCard) => {
    setApplyingRoleId(card.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const applied = await configStore.syncDiscordRoles({ role_ids: [card.id] });
      await fetchReport();
      setSuccessMessage(`Applied ${card.name} to ${applied.length} account(s).`);
    } catch (error: any) {
      setErrorMessage(`Failed to apply ${card.name}: ` + error.message);
    } finally {
      setApplyingRoleId(null);
    }
  };

  // After a failed write the list is read again, so a card for a binding the backend no longer has goes away
  const refetchBindings = async () => {
    try {
      setBindings(await configStore.fetchDiscordRoleBindings());
    } catch (error: any) {
      setErrorMessage("Failed to reload the bindings: " + error.message);
    }
  };

  // The card moves at once; the report, which reads the guild, refreshes behind it
  const setSynced = async (row: Binding, synced: boolean) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const before = row.synced;
    setBindings((rows) => rows.map((b) => (b.id === row.id ? { ...b, synced } : b)));
    try {
      await configStore.updateDiscordRoleBinding(row.id, { synced });
      setSuccessMessage(synced ? "Sync now manages this role." : "Sync now leaves this role alone.");
      fetchReport();
    } catch (error: any) {
      setBindings((rows) => rows.map((b) => (b.id === row.id ? { ...b, synced: before } : b)));
      setErrorMessage("Failed to move the role: " + error.message);
      refetchBindings();
    }
  };

  // The role leaves or rejoins the Not bound column at once; the call follows it
  const setHidden = async (role: { id: string }, hidden: boolean) => {
    const row = guildRole(role.id);
    if (!row) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setGuildRoles((rows) => rows.map((r) => (r.id === row.id ? { ...r, hidden } : r)));
    try {
      if (hidden) await configStore.hideDiscordRole(row.id);
      else await configStore.unhideDiscordRole(row.id);
      setSuccessMessage(hidden ? "The app now leaves this role alone." : "Role unhidden.");
    } catch (error: any) {
      setGuildRoles((rows) => rows.map((r) => (r.id === row.id ? { ...r, hidden: !hidden } : r)));
      setErrorMessage(`Failed to ${hidden ? "hide" : "unhide"} the role: ` + error.message);
    }
  };

  const loadGroups = async (row: Picker | null) => {
    setIsLoadingGroups(true);
    setDialogError(null);
    try {
      setGroups(await configStore.fetchDiscordRoleGroups({ season_id: seasonIdOf(row), scope: scopeOf(row) }));
    } catch (error: any) {
      setDialogError("Failed to load the groups: " + error.message);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  // The teams of a season are read once, when its group first opens. A caller that just cleared the
  // map passes the cleared one, because this render still holds the map from before.
  const loadSeasonTeams = async (id: number, cache: Record<number, any> = seasonTeams) => {
    if (!id || cache[id] !== undefined) return;
    setSeasonTeams((current) => ({ ...current, [id]: null }));
    try {
      const rows = await teamStore.fetchTeamsBySeasonBasic(id);
      setSeasonTeams((current) => ({ ...current, [id]: rows }));
    } catch (error: any) {
      setSeasonTeams((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setDialogError(`Failed to load the teams of ${seasonName(id)}: ` + error.message);
    }
  };

  const openSeason = (id: number, open: boolean) => {
    setOpenedSeasons((ids) => (open ? [...ids, id] : ids.filter((one) => one !== id)));
    if (open) loadSeasonTeams(id);
  };

  const selectGroup = async (group: { kind: string; team_id?: number | null }) => {
    if (!picker) return;
    const next = { ...picker, kind: group.kind, team_id: group.team_id ?? null };
    const options = SCOPES[next.kind] ?? [];
    if (!options.includes(next.scope ?? "")) next.scope = options[0] ?? null;
    setPicker(next);
    if (`${scopeOf(next)}:${seasonIdOf(next)}` !== `${scopeOf(picker)}:${seasonIdOf(picker)}`) await loadGroups(next);
  };

  // column is where the role lands: managed posts synced true, ignored posts synced false
  const openPicker = async (card: RoleCard, column: string) => {
    const row = card.binding;
    setDialogError(null);
    let seasonId = currentSeasonId;
    if (!seasonId) {
      seasonId = await resolveCurrentSeasonId();
      setCurrentSeasonId(seasonId);
    }
    const next: Picker = {
      roleName: card.name,
      discord_role: card.id,
      bindingId: row?.id ?? null,
      column,
      kind: row?.kind ?? null,
      team_id: row?.team_id ?? null,
      seasonId: row?.season_id ?? seasonId,
      scope: row?.scope ?? null,
    };
    setPicker(next);
    // A fresh dialog starts with no teams cached; editing a team binding opens the current season's group
    setSeasonTeams({});
    setOpenedSeasons(row?.kind === "team" && seasonId ? [seasonId] : []);
    setPickerDialog(true);
    if (row?.kind === "team" && seasonId) loadSeasonTeams(seasonId, {});
    await loadGroups(next);
  };

  // The role in the picker has no group in the app, so it is hidden instead of bound
  const hideFromPicker = async () => {
    const role = guildRole(picker!.discord_role);
    setPickerDialog(false);
    if (role) await setHidden(role, true);
  };

  const saveBinding = async () => {
    setDialogError(null);
    setIsSavingBinding(true);
    try {
      const { kind, team_id, scope, seasonId, discord_role, bindingId, column } = picker!;
      const body = { kind, team_id, scope, season_id: scope === "season" ? seasonId : null, discord_role };
      if (bindingId) {
        const saved = await configStore.updateDiscordRoleBinding(bindingId, body);
        setBindings((rows) => rows.map((b) => (b.id === bindingId ? saved : b)));
      } else {
        const created = await configStore.createDiscordRoleBinding({ ...body, synced: column === "managed" });
        setBindings((rows) => [...rows, created]);
      }
      setPickerDialog(false);
      setSuccessMessage("Binding saved.");
      fetchReport();
    } catch (error: any) {
      setDialogError("Failed to save the binding: " + error.message);
      refetchBindings();
    } finally {
      setIsSavingBinding(false);
    }
  };

  const openDeleteDialog = (row?: Binding) => {
    setDeleteBinding(row ?? null);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setShowDeleteDialog(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await configStore.deleteDiscordRoleBinding(deleteBinding!.id);
      setBindings((rows) => rows.filter((b) => b.id !== deleteBinding!.id));
      setSuccessMessage("Role unbound.");
      fetchReport();
    } catch (error: any) {
      setErrorMessage("Failed to unbind the role: " + error.message);
      refetchBindings();
    }
  };

  const cardActions = (card: RoleCard): RowAction[] => {
    if (!card.manageable) return [];
    // An admin binding never moves; sync does not read it
    if (card.handManaged) return [{ icon: "mdi-link-off", label: "Unbind", color: "error", onClick: () => openDeleteDialog(card.binding) }];
    if (!card.binding)
      return [
        { icon: "mdi-link-variant", label: "Bind", onClick: () => openPicker(card, "ignored") },
        { icon: "mdi-eye-off", label: "Hide: the app never shows or touches this role", onClick: () => setHidden(card, true) },
      ];

    const edit = { icon: "mdi-pencil", label: "Edit", onClick: () => openPicker(card, columnOf(card)) };
    const unbind = { icon: "mdi-link-off", label: "Unbind", color: "error", onClick: () => openDeleteDialog(card.binding) };
    if (card.binding.synced) {
      return [
        { icon: "mdi-sync", label: "Apply", loading: applyingRoleId === card.id, onClick: () => applyRole(card) },
        { icon: "mdi-hand-back-right", label: "Ignore", onClick: () => setSynced(card.binding!, false) },
        edit,
        unbind,
      ];
    }
    return [{ icon: "mdi-check-decagram", label: "Manage", onClick: () => setSynced(card.binding!, true) }, edit, unbind];
  };

  // The table's Sync column carries Manage and Ignore, so its actions leave them out
  const tableActions = (card: RoleCard): RowAction[] => {
    if (card.state === "hidden") return [{ icon: "mdi-eye", label: "Unhide", onClick: () => setHidden(card, false) }];
    return cardActions(card).filter((a) => a.label !== "Manage" && a.label !== "Ignore");
  };

  // dragleave also fires when the pointer crosses a card inside the zone, so the highlight clears only when it leaves the zone itself
  const clearDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOverColumn(null);
  };

  // Double-click moves a card one column: a bound role swaps between Managed and Ignored, an unbound one opens the picker for Managed
  const moveOnDoubleClick = (card: RoleCard) => {
    if (!card.manageable || card.handManaged) return;
    if (!card.binding) return openPicker(card, "managed");
    return setSynced(card.binding, !card.binding.synced);
  };

  // A drop does what the matching button does: bind, move between columns, or unbind
  const dropOn = (column: string) => {
    const card = allCards.find((c) => c.id === dragRoleId);
    setDragOverColumn(null);
    setDragRoleId(null);
    if (!card || !card.manageable || card.handManaged || columnOf(card) === column) return;
    if (column === "notBound") return openDeleteDialog(card.binding);
    if (!card.binding) return openPicker(card, column);
    return setSynced(card.binding, column === "managed");
  };

  const teamIcon = (team: any, size: string) => (
    <span className={cn("inline-block shrink-0 overflow-hidden rounded-sm", size)}>
      <img className="size-full object-contain" src={teamImageUrl(team)} alt="" onError={showDefaultTeamImage} />
    </span>
  );

  return (
    <div className="p-4">
      {/* The page dims while the roles load. */}
      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <span className="size-16 animate-spin rounded-full border-8 border-primary border-t-transparent" />
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <PageHeader
            title={
              <>
                <svg className="mr-2 inline size-7 align-[-0.15em]" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d={discordMark} />
                </svg>
                Discord Roles
              </>
            }
          />
          {view === "columns" ? <div className="-mt-4 text-sm text-muted-foreground">Drag a card to a column, double-click it, or use its buttons.</div> : null}
        </div>
        <div className="flex items-center gap-3">
          {view === "columns" ? (
            <Select items={SORTS.map((sort) => ({ value: sort.key, label: sort.label }))} value={sortKey} onValueChange={(value) => setSortKey(value as string)}>
              <SelectTrigger aria-label="Sort" className="min-w-[170px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((sort) => (
                  <SelectItem key={sort.key} value={sort.key}>
                    {sort.label}
                  </SelectItem>
                ))}
              </SelectContent>
              {/* The label reads after the select, where the floating label of v-select sits, and order puts it back in front */}
              <span className="order-first text-sm text-muted-foreground">Sort</span>
            </Select>
          ) : null}
          {/* Both layouts ship while admins compare them */}
          <ToggleGroup variant="outline" spacing={0} value={[view]} onValueChange={(value) => value[0] && chooseView(value[0])}>
            <ToggleGroupItem value="columns" aria-label="Columns">
              <Icon name="mdi-view-column" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table">
              <Icon name="mdi-table" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />

      <StatusAlert modelValue={successMessage} type="success" onClose={() => setSuccessMessage(null)} />

      {!guildRoles.length ? <StatusAlert modelValue="The bot could not read the server's roles. Bindings are shown by id." type="warning" /> : null}

      <div className="flex flex-col gap-4">
        {/* One card per Discord role, in the column its binding puts it in */}
        {view === "columns" ? (
          <div className="grid gap-4 md:grid-cols-3">
            {COLUMNS.map((column) => (
              <Card key={column.key} className="card flex flex-col gap-0 py-0 md:h-[calc(100vh-320px)] md:min-h-[360px]">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Icon name={column.icon} />
                    <span>{column.label}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {cards[column.key].length}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{column.subtitle}</p>
                </CardHeader>
                <Separator />

                <div
                  className={cn(
                    "flex-1 overflow-y-auto rounded border-2 border-dashed border-transparent p-2",
                    dragOverColumn === column.key && "border-primary bg-primary/10",
                  )}
                  onDragOver={(event) => event.preventDefault()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragOverColumn(column.key);
                  }}
                  onDragLeave={clearDragOver}
                  onDrop={(event) => {
                    event.preventDefault();
                    dropOn(column.key);
                  }}
                >
                  {!cards[column.key].length ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">{loadFailed ? "Could not load the roles." : column.empty}</div>
                  ) : null}

                  {cards[column.key].map((card) => (
                    <LockedHint
                      key={card.id}
                      locked={!card.manageable}
                      className="card mb-2 cursor-grab rounded-lg select-none [&_img]:pointer-events-none"
                      draggable={card.manageable && !card.handManaged}
                      onDragStart={() => setDragRoleId(card.id)}
                      onDragEnd={() => {
                        setDragRoleId(null);
                        setDragOverColumn(null);
                      }}
                      onDoubleClick={() => moveOnDoubleClick(card)}
                    >
                      <div className="p-3">
                        <div className="flex items-center">
                          <span className="mr-2 inline-block size-3 shrink-0 rounded-full" style={{ backgroundColor: card.dot }} />
                          <span className={cn(!card.named && "text-muted-foreground italic")} title={card.id}>
                            {card.name}
                          </span>
                          {card.named ? (
                            <Badge
                              variant="secondary"
                              className={cn("ml-auto", card.binding && card.binding.holders !== card.members && "text-warning")}
                            >
                              {card.binding ? `${card.binding.holders} in app · ` : ""}
                              {card.members} in Discord
                            </Badge>
                          ) : null}
                        </div>

                        {card.binding ? (
                          <div className="mt-1 flex items-center text-sm text-muted-foreground">
                            {card.handManaged ? <Icon name="mdi-lock" className="mr-1 text-sm" /> : null}
                            {card.groupTeam ? <span className="mr-1">{teamIcon(card.groupTeam, "size-5")}</span> : null}
                            <span>{card.groupLabel}</span>
                          </div>
                        ) : null}

                        <RowActions actions={cardActions(card)} inline />
                      </div>
                    </LockedHint>
                  ))}
                </div>

                {/* The roles an admin hid, folded away under the Not bound column */}
                {column.key === "notBound" && hiddenRoles.length ? (
                  <>
                    <Separator />
                    <Accordion className="px-4">
                      <AccordionItem value="hidden">
                        <AccordionTrigger>Hidden roles ({hiddenRoles.length})</AccordionTrigger>
                        <AccordionContent>
                          {hiddenRoles.map((role) => (
                            <LockedHint key={role.id} locked={!role.manageable} className="mb-2 flex items-center">
                              <span className="mr-2 inline-block size-3 shrink-0 rounded-full" style={{ backgroundColor: roleDot(role) }} />
                              <span title={role.id}>{role.name}</span>
                              <Badge variant="secondary" className="mr-1 ml-auto">
                                {role.members} in Discord
                              </Badge>
                              {role.hidden ? <RowActions actions={[{ icon: "mdi-eye", label: "Unhide", onClick: () => setHidden(role, false) }]} inline /> : null}
                            </LockedHint>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </>
                ) : null}
              </Card>
            ))}
          </div>
        ) : (
          /* One row per Discord role, hidden and locked ones included */
          <Card className="card p-0">
            <DataTable
              data={allCards}
              sorting={tableSorting}
              onSortingChange={setTableSorting}
              columns={[
                {
                  id: "name",
                  accessorKey: "name",
                  header: "Role",
                  cell: ({ row }) => (
                    <LockedHint locked={!row.original.manageable} className="flex items-center">
                      <span className="mr-2 inline-block size-3 shrink-0 rounded-full" style={{ backgroundColor: row.original.dot }} />
                      <span className={cn(!row.original.named && "text-muted-foreground italic")} title={row.original.id}>
                        {row.original.name}
                      </span>
                    </LockedHint>
                  ),
                },
                {
                  id: "groupLabel",
                  accessorFn: (card: RoleCard) => card.groupLabel ?? "",
                  header: "Bound to",
                  cell: ({ row }) =>
                    row.original.binding ? (
                      <div className="flex items-center">
                        {row.original.handManaged ? <Icon name="mdi-lock" className="mr-1 text-sm" /> : null}
                        {row.original.groupTeam ? <span className="mr-1">{teamIcon(row.original.groupTeam, "size-5")}</span> : null}
                        <span>{row.original.groupLabel}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    ),
                },
                {
                  id: "holders",
                  accessorFn: (card: RoleCard) => card.binding?.holders ?? -1,
                  header: () => <div className="text-right">In app</div>,
                  cell: ({ row }) => (
                    <div className="tnum text-right">{row.original.binding ? row.original.binding.holders : <span className="text-muted-foreground">—</span>}</div>
                  ),
                },
                {
                  id: "members",
                  accessorKey: "members",
                  header: () => <div className="text-right">In Discord</div>,
                  cell: ({ row }) => (
                    <div className={cn("tnum text-right", row.original.binding && row.original.binding.holders !== row.original.members && "font-medium text-warning")}>
                      {row.original.members}
                    </div>
                  ),
                },
                {
                  id: "state",
                  accessorKey: "state",
                  header: "Sync",
                  sortFn: (a: any, b: any) => STATE_ORDER.indexOf(a.original.state) - STATE_ORDER.indexOf(b.original.state),
                  cell: ({ row }) =>
                    row.original.binding && !row.original.handManaged ? (
                      <ToggleGroup
                        variant="outline"
                        spacing={0}
                        value={[row.original.state]}
                        onValueChange={(value) => value[0] && setSynced(row.original.binding!, value[0] === "managed")}
                      >
                        <ToggleGroupItem value="managed" size="sm">
                          <Icon name="mdi-sync" />
                          Managed
                        </ToggleGroupItem>
                        <ToggleGroupItem value="ignored" size="sm">
                          <Icon name="mdi-hand-back-right" />
                          Ignored
                        </ToggleGroupItem>
                      </ToggleGroup>
                    ) : (
                      <span className="text-muted-foreground">{row.original.handManaged ? "Hand-managed" : STATE_LABEL[row.original.state]}</span>
                    ),
                },
                {
                  id: "actions",
                  header: "",
                  enableSorting: false,
                  cell: ({ row }) => <RowActions actions={tableActions(row.original)} inline />,
                },
              ]}
            />
          </Card>
        )}

        {/* What the guild has and the database says it should have */}
        <Card className={cn("card gap-0 py-0", view === "columns" && "order-first")}>
          <CardHeader className="bg-primary p-4">
            <CardTitle className="flex items-center gap-2 text-on-primary">
              <Icon name="mdi-account-sync" />
              <span>Accounts out of sync</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <div className="flex p-2 sm:justify-end">
              <Button className="w-full sm:w-auto" onClick={syncAll} disabled={isSyncing}>
                <Icon name={isSyncingAll ? "mdi-loading mdi-spin" : "mdi-sync"} />
                Sync all
              </Button>
            </div>

            <DataTable
              data={report}
              pageSize={10}
              empty={
                isLoadingReport ? (
                  "Loading…"
                ) : (
                  <div className="p-8 text-center">
                    <Icon name={loadFailed ? "mdi-alert-circle-outline" : "mdi-check-circle-outline"} size={64} className="text-muted-foreground" />
                    <div className="mt-4 text-xl text-muted-foreground">{loadFailed ? "Could not load the comparison" : "Every account matches the database"}</div>
                  </div>
                )
              }
              columns={[
                { id: "name", accessorKey: "name", header: "Name" },
                { id: "discord_id", accessorKey: "discord_id", header: "Discord ID" },
                {
                  id: "missing",
                  header: "Missing",
                  enableSorting: false,
                  cell: ({ row }) =>
                    row.original.missing.length ? (
                      row.original.missing.map((role) => (
                        <Badge key={role} variant="secondary" className="mr-1 text-warning" title={role}>
                          {roleName(role)}
                        </Badge>
                      ))
                    ) : (
                      <span>—</span>
                    ),
                },
                {
                  id: "extra",
                  header: "Extra",
                  enableSorting: false,
                  cell: ({ row }) =>
                    row.original.extra.length ? (
                      row.original.extra.map((role) => (
                        <Badge key={role} variant="secondary" className="mr-1 text-error" title={role}>
                          {roleName(role)}
                        </Badge>
                      ))
                    ) : (
                      <span>—</span>
                    ),
                },
                {
                  id: "actions",
                  header: "",
                  enableSorting: false,
                  cell: ({ row }) => (
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => syncOne(row.original)} disabled={isSyncing}>
                        <Icon name={syncingUserId === row.original.user_id ? "mdi-loading mdi-spin" : "mdi-sync"} />
                        Sync
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {/* The group picker: which people in the database hold this role */}
      <Dialog open={pickerDialog} onOpenChange={setPickerDialog}>
        <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-[640px]">
          {picker ? (
            <>
              <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
                <Icon name="mdi-account-group" />
                Who holds {picker.roleName}?
              </DialogTitle>

              <StatusAlert modelValue={dialogError} className="mx-4 my-2" onClose={() => setDialogError(null)} />

              <div className="max-h-[60vh] overflow-y-auto p-4">
                <ul className={cn("text-sm", isLoadingGroups && "pointer-events-none opacity-60")}>
                  <li className="px-2 py-1 text-xs text-muted-foreground uppercase">{listScopeLabel}</li>
                  {seasonGroups.map((group) => (
                    <li key={groupKey(group)}>
                      <button
                        type="button"
                        className={cn("flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-accent", groupKey(group) === groupKey(picker) && "bg-accent")}
                        onClick={() => selectGroup(group)}
                      >
                        <span className="flex-1">{group.label}</span>
                        <Badge variant="secondary">{group.count}</Badge>
                      </button>
                    </li>
                  ))}

                  {/* One collapsed group per season, newest first; opening it loads that season's teams */}
                  <li className="px-2 py-1 text-xs text-muted-foreground uppercase">Teams</li>
                  {seasonsNewestFirst.map((season: any) => (
                    <li key={season.id}>
                      <Collapsible open={openedSeasons.includes(season.id)} onOpenChange={(open) => openSeason(season.id, open)}>
                        <CollapsibleTrigger className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-accent">
                          <span className="flex-1">{season.name}</span>
                          <Icon name={openedSeasons.includes(season.id) ? "mdi-chevron-up" : "mdi-chevron-down"} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-4">
                          {seasonTeams[season.id] === null ? <div className="px-2 py-1.5">Loading teams…</div> : null}
                          {seasonTeams[season.id] !== null && !seasonTeams[season.id]?.length ? <div className="px-2 py-1.5">No teams in this season</div> : null}
                          {(seasonTeams[season.id] ?? []).map((team: any) => (
                            <button
                              key={team.id}
                              type="button"
                              className={cn(
                                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-accent",
                                `team:${team.id}` === groupKey(picker) && "bg-accent",
                              )}
                              onClick={() => selectGroup({ kind: "team", team_id: team.id })}
                            >
                              {teamIcon(team, "size-6")}
                              <span className="ml-2 flex-1">{team.long_name || team.name}</span>
                              <Badge variant="secondary">{teamCounts[team.id] ?? 0}</Badge>
                            </button>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    </li>
                  ))}
                </ul>

                {/* One scope control under the list, in the shape the picked group's kind needs */}
                {picker.kind ? (
                  <>
                    {scopeOptions.length > 1 ? (
                      <RadioGroup
                        value={picker.scope}
                        onValueChange={(value) => {
                          const next = { ...picker, scope: value as string };
                          setPicker(next);
                          loadGroups(next);
                        }}
                      >
                        {scopeOptions.map((option) =>
                          option === "season" ? (
                            <div key={option} className="flex items-center gap-3">
                              <label className="flex items-center gap-2">
                                <RadioGroupItem value="season" />
                                <span>One season</span>
                              </label>
                              <Select
                                items={seasons.map((season: any) => ({ value: season.id, label: season.name }))}
                                value={picker.seasonId}
                                disabled={picker.scope !== "season"}
                                onValueChange={(value) => {
                                  const next = { ...picker, seasonId: value as number };
                                  setPicker(next);
                                  loadGroups(next);
                                }}
                              >
                                <SelectTrigger aria-label="Season" className="max-w-[220px]">
                                  <SelectValue placeholder="Season" />
                                </SelectTrigger>
                                <SelectContent>
                                  {seasons.map((season: any) => (
                                    <SelectItem key={season.id} value={season.id}>
                                      {season.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <label key={option} className="flex items-center gap-2">
                              <RadioGroupItem value={option} />
                              <span>{option === "all" ? "All seasons" : `Current season (${seasonName(currentSeasonId)})`}</span>
                            </label>
                          ),
                        )}
                      </RadioGroup>
                    ) : picker.kind === "champion" ? (
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-sm">One season</span>
                        <Select
                          items={seasons.map((season: any) => ({ value: season.id, label: season.name }))}
                          value={picker.seasonId}
                          onValueChange={(value) => {
                            const next = { ...picker, seasonId: value as number };
                            setPicker(next);
                            loadGroups(next);
                          }}
                        >
                          <SelectTrigger aria-label="Season" className="max-w-[220px]">
                            <SelectValue placeholder="Season" />
                          </SelectTrigger>
                          <SelectContent>
                            {seasons.map((season: any) => (
                              <SelectItem key={season.id} value={season.id}>
                                {season.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                    <div className="mt-2 text-xs text-muted-foreground">{scopeCaption}</div>
                  </>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                {/* A new binding lands where the admin opened the picker from; the toggle lets them change that here */}
                {!picker.bindingId ? (
                  <>
                    <ToggleGroup
                      variant="outline"
                      spacing={0}
                      value={[picker.column]}
                      onValueChange={(value) => value[0] && setPicker({ ...picker, column: value[0] })}
                    >
                      <ToggleGroupItem value="managed">
                        <Icon name="mdi-sync" />
                        Managed
                      </ToggleGroupItem>
                      <ToggleGroupItem value="ignored">
                        <Icon name="mdi-hand-back-right" />
                        Ignored
                      </ToggleGroupItem>
                    </ToggleGroup>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button variant="ghost" size="sm" onClick={hideFromPicker}>
                            <Icon name="mdi-eye-off" />
                            Hide instead
                          </Button>
                        }
                      />
                      <TooltipContent>Nothing in the app fits this role</TooltipContent>
                    </Tooltip>
                  </>
                ) : null}
                <div className="flex-1" />
                <Button variant="ghost" onClick={() => setPickerDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={saveBinding} disabled={!picker.kind || isSavingBinding}>
                  <Icon name={isSavingBinding ? "mdi-loading mdi-spin" : "mdi-check"} />
                  {picker.bindingId ? "Save" : "Bind"}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        modelValue={showDeleteDialog}
        message="Unbind this role? Members keep it; the app stops managing it."
        onUpdateModelValue={setShowDeleteDialog}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}

export default DiscordRolesView;
