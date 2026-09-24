"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toneClass } from "@/components/ui/tone";
import { StatusAlert } from "@/components/StatusAlert";
import { W3CIcon } from "@/components/W3CIcon";
import { addTagError, bnetNote, tagSourceLine, tagsActiveFirst } from "@/helpers/tags.mjs";
import { w3cPlayerUrl } from "@/helpers/w3c-stats.js";
import { usePlayerStore } from "@/stores";
import type { PlayerTag } from "@/stores";

const BATTLE_TAG = /^\S+#\d+$/;

/** The owner's own battle tags on his player page: which one is active, the ones he may
 *  remove, and "I also played as" to add another. Every write answers his row, and the
 *  page reads the profile again, because the header, the address and the MMR follow the active tag.
 *  "Link Battle.net" leaves for Blizzard, which sends the browser back with ?bnet=<token> or ?bnet=error. */
export function MyAccounts({ player, onChanged }: { player: { tags?: PlayerTag[] | null }; onChanged: () => Promise<void> }) {
  const playerStore = usePlayerStore();
  const tags: PlayerTag[] = tagsActiveFirst(player.tags ?? []);
  const active = tags.find((row) => row.active);

  const router = useRouter();
  const searchParams = useSearchParams();
  // the return from Blizzard, read once so it outlives the address clean-up below
  const [bnet] = useState(() => searchParams.get("bnet"));

  const [busy, setBusy] = useState<number | null>(null); // the tag row a write is out for
  const [pageError, setPageError] = useState<string | null>(() => bnetNote(bnet, searchParams.get("reason")));
  const [typed, setTyped] = useState("");
  const [checking, setChecking] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null); // the line under the field after a success
  const [linking, setLinking] = useState(false);

  // a ?bnet=<token> return links the account to this login; either way drop ?bnet= from the address
  useEffect(() => {
    if (!bnet) return;
    if (bnet !== "error" && bnet !== "linked") {
      playerStore.finishBnetLink(bnet).then(
        () => { setAdded("Battle.net account linked"); return onChanged(); },
        (error) => { const { field, page } = addTagError(error); setPageError(field ?? page); },
      );
    }
    const query = new URLSearchParams(searchParams);
    query.delete("bnet");
    query.delete("reason");
    router.replace(window.location.pathname + (query.size ? `?${query}` : ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const linkBnet = async () => {
    setLinking(true);
    setPageError(null);
    try {
      const { url } = await playerStore.startBnetLink();
      window.location.assign(url);
    } catch (error) {
      setPageError((error as Error).message);
      setLinking(false);
    }
  };

  const write = async (tagId: number, run: () => Promise<unknown>) => {
    setBusy(tagId);
    setPageError(null);
    setAdded(null);
    try {
      await run();
      await onChanged();
    } catch (error) {
      setPageError((error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const tag = typed.trim();
    setAdded(null);
    setPageError(null);
    if (!BATTLE_TAG.test(tag)) {
      setFieldError("Enter a battle tag like Name#1234.");
      return;
    }
    setChecking(true);
    setFieldError(null);
    try {
      await playerStore.addMyTag(tag);
      setTyped("");
      setAdded(`Added ${tag}`);
      await onChanged();
    } catch (error) {
      const { field, page } = addTagError(error);
      setFieldError(field);
      setPageError(page);
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card className="card mb-6 gap-0 py-0">
      <CardTitle className="flex items-center gap-2 bg-primary p-4 text-on-primary">
        <Icon name="mdi-card-account-details" />
        My accounts
        <span className="tnum ms-auto text-sm font-normal">
          {tags.length} {tags.length === 1 ? "tag" : "tags"}
        </span>
      </CardTitle>
      <CardContent className="p-0">
        <StatusAlert modelValue={pageError} className="m-4" onClose={() => setPageError(null)} />
        {tags.length ? (
          <RadioGroup
            aria-label="Active account"
            className="gap-0"
            value={active ? String(active.id) : ""}
            onValueChange={(value) => {
              const id = Number(value);
              if (id !== active?.id) write(id, () => playerStore.makeMyTagActive(id));
            }}
          >
            {tags.map((row) => (
              <div key={row.id} className="grid grid-cols-[20px_1fr_auto] items-start gap-3 border-b px-4 py-3">
                <RadioGroupItem id={`tag-${row.id}`} value={String(row.id)} className="mt-1" disabled={busy !== null} aria-label={`Make ${row.tag} active`} />
                <label htmlFor={`tag-${row.id}`} className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {row.tag}
                    {row.active ? <Badge className={toneClass("primary")}>Active</Badge> : null}
                    {busy === row.id ? <Icon name="mdi-loading mdi-spin" size={16} /> : null}
                  </span>
                  <span className="text-sm text-muted-foreground">{tagSourceLine(row)}</span>
                </label>
                <span className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" nativeButton={false} render={<a href={w3cPlayerUrl(row.tag)} target="_blank" rel="noopener noreferrer" />}>
                    <W3CIcon size={16} />
                    W3C
                  </Button>
                  {/* a verified or active tag stays; the player makes another active first */}
                  {!row.active && !row.verified ? (
                    <Button variant="ghost" size="icon-sm" aria-label={`Remove ${row.tag}`} disabled={busy !== null} onClick={() => write(row.id, () => playerStore.removeMyTag(row.id))}>
                      <Icon name="mdi-close" />
                    </Button>
                  ) : null}
                </span>
              </div>
            ))}
          </RadioGroup>
        ) : null}
        <form className="px-4 py-3" onSubmit={add}>
          <Field
            label="I also played as"
            htmlFor="also-played-as"
            error={fieldError}
            hint={checking || added ? undefined : "Checked against W3Champions"}
          >
            <div className="flex gap-2">
              <Input
                id="also-played-as"
                className="min-w-0 flex-1"
                placeholder="Name#1234"
                value={typed}
                aria-invalid={!!fieldError}
                onChange={(event) => { setTyped(event.target.value); setFieldError(null); setAdded(null); }}
              />
              <Button type="submit" variant="outline" disabled={checking || !typed.trim()}>Add</Button>
              <Button type="button" variant="outline" disabled={linking} onClick={linkBnet}>Link Battle.net</Button>
            </div>
          </Field>
          {checking ? (
            <p role="status" className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon name="mdi-loading mdi-spin" size={14} />
              Checking W3Champions
            </p>
          ) : added ? (
            <p role="status" className="mt-1.5 flex items-center gap-1.5 text-xs">
              <Icon name="mdi-check" size={14} className="text-success" />
              {added}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

export default MyAccounts;
