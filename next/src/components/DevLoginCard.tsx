"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Note } from "@/components/ui/Note";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { backendUrl, fetchWrapper } from "@/helpers";
import { useAuth } from "@/stores";
import { cn } from "@/lib/utils";

type DevPlayer = { id: number; name: string; battle_tag: string | null; captain: boolean };
type Role = "member" | "guest" | "admin";

const ROLES: { value: Role; title: string }[] = [
  { value: "member", title: "Player" },
  { value: "guest", title: "Guest" },
  { value: "admin", title: "Admin" },
];

/** Whether this build offers the local dev login. Set only in a local `.env.local`. */
export const devLoginEnabled = process.env.NEXT_PUBLIC_DEV_LOGIN === "1";

/** Sign in as any player of the local database, to test the app as that player. A player with a
 *  captain seat signs in as a captain. Local testing only: the backend answers it only when its own
 *  dev login is on. */
export function DevLoginCard() {
  const { devLogin } = useAuth();
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState<DevPlayer[]>([]);
  const [picked, setPicked] = useState<DevPlayer | null>(null);
  const [role, setRole] = useState<Role>("member");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // one read per pause in typing; the list holds 30 players at most
  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      fetchWrapper
        .get(`${backendUrl}/dev/players?search=${encodeURIComponent(search.trim())}`)
        .then((rows: DevPlayer[]) => {
          if (!live) return;
          setPlayers(rows);
          setError(null);
        })
        .catch((failure: Error & { status?: number }) =>
          live && setError(failure.status === 404 || !failure.message ? "The dev login is off on the backend. Set DEV_LOGIN=1 there." : failure.message),
        );
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [search]);

  const signIn = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      await devLogin(picked.id, role);
    } catch (failure) {
      setError((failure as Error).message);
      setBusy(false);
    }
  };

  return (
    <Card className="mt-4 w-full max-w-[500px] gap-0 p-0">
      <CardHeader className="banner bg-banner p-4">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Icon name="mdi-account-switch" />
          Sign in as a player
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-6">
        <p className="text-sm text-muted-foreground">For local testing, signed in with the admin token. Pick a player and a role; a player with a captain seat signs in as a captain.</p>

        <Field label="Find a player" htmlFor="dev-player-search">
          <Input id="dev-player-search" value={search} placeholder="Name or battle tag" onChange={(event) => setSearch(event.target.value)} />
        </Field>

        <ul className="flex max-h-64 flex-col overflow-y-auto rounded border border-border" aria-label="Players">
          {players.map((player) => (
            <li key={player.id}>
              <button
                type="button"
                aria-pressed={picked?.id === player.id}
                onClick={() => setPicked(player)}
                className={cn("flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent", picked?.id === player.id && "bg-accent font-medium")}
              >
                <span className="flex-1 truncate">
                  {player.name}
                  {player.battle_tag ? <span className="ml-2 text-sm text-muted-foreground">{player.battle_tag}</span> : null}
                </span>
                {player.captain ? <Badge className="bg-secondary text-on-secondary">Captain</Badge> : null}
              </button>
            </li>
          ))}
          {!players.length ? <li className="px-3 py-2 text-sm text-muted-foreground">No player with a Discord id matches.</li> : null}
        </ul>

        <Field label="Sign in as">
          <ToggleGroup variant="outline" spacing={0} value={[role]} onValueChange={(value) => value[0] && setRole(value[0] as Role)}>
            {ROLES.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {option.title}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        <Button size="lg" className="h-11 w-full" disabled={!picked || busy} onClick={signIn}>
          <Icon name={busy ? "mdi-loading" : "mdi-login"} className={busy ? "animate-spin" : undefined} />
          {picked ? `Sign in as ${picked.name}` : "Pick a player first"}
        </Button>

        {error ? <Note type="error">{error}</Note> : null}
      </CardContent>
    </Card>
  );
}
