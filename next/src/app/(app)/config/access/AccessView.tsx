"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { PageHeader } from "@/components/PageHeader";
import { PlayerName } from "@/components/PlayerName";
import { RowActions } from "@/components/RowActions";
import { StatusAlert } from "@/components/StatusAlert";
import { MD_AND_UP, useBreakpoint } from "@/hooks/breakpoint";
import { useAuth, useConfigStore, usePlayerStore } from "@/stores";
import { formatDateTime } from "@/helpers/datetime";

type Admin = { discord_id: string; name?: string; granted_at?: string | null; source: string };

/** The people the app grants admin rights to, beside the ones the environment names. */
export function AccessView() {
  const { me } = useAuth();
  const configStore = useConfigStore();
  const playerStore = usePlayerStore();

  const [players, setPlayers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  // The page opens on its load, so the overlay is up before the first request goes out
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // True while the load failed, so an empty table does not read as "no admins"
  const [loadFailed, setLoadFailed] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [addDialog, setAddDialog] = useState(false);
  const [picked, setPicked] = useState(""); // a discordId from the list, or a raw one typed in
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteRow, setDeleteRow] = useState<Admin | null>(null);

  const mdAndUp = useBreakpoint(MD_AND_UP);

  // An admin is usually a player, so the name carries the flag and the link the rest of the app gives it
  const playerOf = (row: Admin) => players.find((p) => String(p.discordId) === String(row.discord_id));

  // env rows are granted outside the app, and an admin cannot remove themself
  const canRemove = (row: Admin) => row.source === "app" && row.discord_id !== me?.discord_id;

  useEffect(() => {
    Promise.all([configStore.fetchAdmins(), playerStore.fetchPlayers()])
      .then(([rows, playerRows]) => {
        setAdmins(rows);
        setPlayers(playerRows);
      })
      .catch((error: any) => {
        setLoadFailed(true);
        setErrorMessage("Failed to load the admins: " + error.message);
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setPicked("");
    setDialogError(null);
    setAddDialog(true);
  };

  const saveAdmin = async () => {
    setDialogError(null);
    setIsSaving(true);
    try {
      const discord_id = String(picked).trim();
      const name = players.find((p) => String(p.discordId) === discord_id)?.name;
      await configStore.addAdmin({ discord_id, name });
      setAdmins(await configStore.fetchAdmins());
      setAddDialog(false);
      setSuccessMessage("Admin added.");
    } catch (error: any) {
      setDialogError("Failed to add the admin: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteDialog = (row: Admin) => {
    setDeleteRow(row);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setShowDeleteDialog(false);
    setErrorMessage(null);
    try {
      await configStore.removeAdmin(deleteRow!.discord_id);
      setAdmins(await configStore.fetchAdmins());
      setSuccessMessage("Admin removed.");
    } catch (error: any) {
      setErrorMessage("Failed to remove the admin: " + error.message);
    }
  };

  return (
    <div className="p-4">
      {/* The page dims while the admins load. */}
      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <span className="size-16 animate-spin rounded-full border-8 border-primary border-t-transparent" />
        </div>
      ) : null}

      <PageHeader title={<><Icon name="mdi-shield-account" className="mr-2" />Access</>} />

      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />

      <StatusAlert modelValue={successMessage} type="success" onClose={() => setSuccessMessage(null)} />

      <Card className="card gap-0 py-0">
        <CardHeader className="bg-primary p-4">
          <CardTitle className="flex items-center gap-2 text-on-primary">
            <Icon name="mdi-account-key" />
            <span>Gym admins</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex p-2 sm:justify-end">
            <Button className="w-full sm:w-auto" onClick={openAdd}>
              <Icon name="mdi-plus" />
              Add admin
            </Button>
          </div>

          <DataTable
            data={admins}
            pageSize={10}
            columnVisibility={{ discord_id: mdAndUp, granted_at: mdAndUp }}
            empty={
              <div className="p-8 text-center">
                <Icon name={loadFailed ? "mdi-alert-circle-outline" : "mdi-account-off-outline"} size={64} className="text-muted-foreground" />
                <div className="mt-4 text-xl text-muted-foreground">{loadFailed ? "Could not load the admins" : "No admins granted yet"}</div>
              </div>
            }
            columns={[
              {
                id: "name",
                accessorKey: "name",
                header: "Name",
                cell: ({ row }) => {
                  const player = playerOf(row.original);
                  return player ? <PlayerName player={player} /> : row.original.name;
                },
              },
              { id: "discord_id", accessorKey: "discord_id", header: "Discord ID" },
              {
                id: "granted_at",
                accessorKey: "granted_at",
                header: "Granted",
                cell: ({ row }) => formatDateTime(row.original.granted_at),
              },
              {
                id: "source",
                accessorKey: "source",
                header: "Source",
                cell: ({ row }) => (
                  <Badge variant={row.original.source === "env" ? "outline" : "secondary"}>
                    {row.original.source === "env" ? "Environment" : "App"}
                  </Badge>
                ),
              },
              {
                id: "actions",
                header: "",
                enableSorting: false,
                cell: ({ row }) =>
                  canRemove(row.original) ? (
                    <RowActions actions={[{ icon: "mdi-delete", label: "Remove admin", color: "error", onClick: () => openDeleteDialog(row.original) }]} />
                  ) : null,
              },
            ]}
          />
        </CardContent>
      </Card>

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-[600px]">
          <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
            <Icon name="mdi-plus-circle" />
            Add admin
          </DialogTitle>

          <StatusAlert modelValue={dialogError} className="mx-4 my-2" onClose={() => setDialogError(null)} />

          <div className="p-4">
            {/* The port of the free-text combobox: a native list, so a Discord ID nobody signed up with still goes in */}
            <Field label="User" hint="Pick a user or type a Discord ID" htmlFor="admin-user">
              <Input id="admin-user" list="admin-players" value={picked} onChange={(event) => setPicked(event.target.value)} />
              <datalist id="admin-players">
                {players.map((player) => (
                  <option key={player.id} value={String(player.discordId ?? "")} label={player.name} />
                ))}
              </datalist>
            </Field>
          </div>

          <div className="flex justify-end gap-2 px-4 py-3">
            <Button variant="ghost" onClick={() => setAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveAdmin} disabled={!picked || isSaving}>
              <Icon name={isSaving ? "mdi-loading mdi-spin" : "mdi-check"} />
              Add admin
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        modelValue={showDeleteDialog}
        message="Remove this admin?"
        onUpdateModelValue={setShowDeleteDialog}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}

export default AccessView;
