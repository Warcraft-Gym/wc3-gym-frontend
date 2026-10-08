"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/Combobox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusAlert } from "@/components/StatusAlert";
import { formatDateTime } from "@/helpers/datetime";
import { useConfigStore } from "@/stores";

type Organizer = { discord_id: string; name: string; granted_at: string; events: number };
type Request = { discord_id: string; name: string; note: string | null; requested_at: string; user_id: number | null };

const phoneCell = "hidden min-[960px]:table-cell";

/** The organizers beside the admins: the requests members sent, waiting for an answer, then
 *  everyone who may create cups. A revoke stops new cups; the cups an organizer already runs
 *  keep them until a runner of that cup removes them. */
export function OrganizersCard({ players }: { players: any[] }) {
  const configStore = useConfigStore();
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState("");

  const playerItems = players
    .filter((player) => player.discordId)
    .map((player) => ({ value: String(player.discordId), title: player.name, tag: player.discordTag || String(player.discordId) }));

  const load = async () => {
    const [rows, waiting] = await Promise.all([configStore.fetchOrganizers(), configStore.fetchOrganizerRequests()]);
    setOrganizers(rows);
    setRequests(waiting);
  };

  useEffect(() => {
    queueMicrotask(() => load().catch((e) => setError(`The organizers did not load: ${(e as Error).message}`)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (key: string, work: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await work();
      await load();
      return true;
    } catch (e) {
      setError((e as Error).message || "The write failed");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const add = async () => {
    const discord_id = picked.trim();
    const name = players.find((p) => String(p.discordId) === discord_id)?.name || "";
    if (await act("add", () => configStore.addOrganizer({ discord_id, name }))) setAdding(false);
  };

  return (
    <Card className="card mt-6 gap-0 py-0">
      <CardHeader className="banner bg-banner p-4">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Icon name="mdi-trophy-outline" />
          <span>Event Organizers</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-4">
        <p className="text-sm text-muted-foreground">
          An organizer creates cups from the Events page and runs the ones they created or were added to. GNL seasons and KOTH nights stay with the admins. An organizer needs no player
          profile, only a Discord login, and stays one while they are in the WC3 Gym Discord.
        </p>

        <StatusAlert modelValue={error} onClose={() => setError(null)} />

        {requests.length ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-base font-bold">Requests waiting · {requests.length}</h3>
            {requests.map((request) => (
              <div key={request.discord_id} className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/50 p-3">
                <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-0.5">
                  <span className="font-bold">
                    {request.name || request.discord_id}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      · {request.user_id ? "has a player profile" : "no player profile"} · asked {formatDateTime(request.requested_at)}
                    </span>
                  </span>
                  {request.note ? <span className="text-sm text-muted-foreground">{request.note}</span> : null}
                </div>
                <Button variant="outline" disabled={!!busy} onClick={() => act(`decline-${request.discord_id}`, () => configStore.declineOrganizer(request.discord_id))}>
                  Decline
                </Button>
                <Button disabled={!!busy} onClick={() => act(`approve-${request.discord_id}`, () => configStore.approveOrganizer(request.discord_id))}>
                  {busy === `approve-${request.discord_id}` ? <Icon name="mdi-loading mdi-spin" /> : <Icon name="mdi-check" />}
                  Approve
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex sm:justify-end">
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => { setPicked(""); setAdding(true); }}>
            <Icon name="mdi-plus" />
            Add organizer
          </Button>
        </div>

        <div className="table-scroll overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organizer</TableHead>
                <TableHead className={phoneCell}>Since</TableHead>
                <TableHead className="text-right">Cups</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizers.map((row) => (
                <TableRow key={row.discord_id}>
                  <TableCell className="font-bold">{row.name || row.discord_id}</TableCell>
                  <TableCell className={phoneCell}>{formatDateTime(row.granted_at)}</TableCell>
                  <TableCell className="text-right">{row.events}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-error" disabled={!!busy} onClick={() => act(`revoke-${row.discord_id}`, () => configStore.removeOrganizer(row.discord_id))}>
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!organizers.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    <Badge variant="outline">No organizers yet</Badge>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={adding} onOpenChange={setAdding} disablePointerDismissal>
        <DialogContent showCloseButton={false} size="sm" className="gap-0 p-0">
          <DialogTitle className="flex items-center gap-2 banner bg-banner px-4 py-3 text-primary">
            <Icon name="mdi-plus-circle" />
            Add organizer
          </DialogTitle>
          <div className="p-4">
            <Field label="User" hint="Pick a user or type a Discord ID" htmlFor="organizer-user">
              <Combobox
                label="Pick a user"
                items={playerItems}
                value={picked || null}
                onChange={(value) => setPicked(value ?? "")}
                row={(item) => (
                  <span className="flex flex-col text-left">
                    <span>{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.tag}</span>
                  </span>
                )}
              />
              <Input id="organizer-user" value={picked} placeholder="Discord ID" onChange={(event) => setPicked(event.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 px-4 py-3">
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button onClick={add} disabled={!picked.trim() || busy === "add"}>
              <Icon name={busy === "add" ? "mdi-loading mdi-spin" : "mdi-check"} />
              Add organizer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default OrganizersCard;
