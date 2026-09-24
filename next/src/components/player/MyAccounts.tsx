"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { toneClass } from "@/components/ui/tone";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusAlert } from "@/components/StatusAlert";
import { W3CIcon } from "@/components/W3CIcon";
import { addTagError, bnetNote, tagsActiveFirst, verifiedTag } from "@/helpers/tags.mjs";
import { w3cPlayerUrl } from "@/helpers/w3c-stats.js";
import { usePlayerStore } from "@/stores";
import type { LinkPrompt, PlayerTag } from "@/stores";

const BATTLE_TAG = /^\S+#\d+$/;

/** The mark beside a tag Battle.net confirmed: a tick and the word, the sentence in a tooltip. */
function BnetVerified() {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        render={
          // a tap opens it as well as a hover
          <button
            type="button"
            aria-label="Verified on Battle.net"
            className="inline-flex cursor-help items-center gap-1 text-sm font-normal text-muted-foreground"
            onClick={() => setOpen((o) => !o)}
          />
        }
      >
        <Icon name="mdi-check-decagram" size={16} className="text-primary" />
        Battle.net
      </TooltipTrigger>
      <TooltipContent>Verified on Battle.net</TooltipContent>
    </Tooltip>
  );
}

/** One open prompt: an earlier player who may be the owner, or a tag another player verified. */
function PromptRow({ prompt, busy, onAnswer }: { prompt: LinkPrompt; busy: boolean; onAnswer: (accept: boolean) => void }) {
  if (prompt.kind === "taken") {
    return (
      <div className="flex flex-wrap items-center gap-3 border-b bg-muted/40 px-4 py-3">
        <span className="min-w-0 flex-1 text-sm">Another player verified {prompt.tag}. Ask an admin if this is wrong.</span>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onAnswer(false)}>OK</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 border-b bg-muted/40 px-4 py-3">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">Is this you? {prompt.tag ?? prompt.name}</span>
        {prompt.seasons.length ? <span className="text-sm text-muted-foreground">{prompt.seasons.join(", ")}</span> : null}
      </span>
      <span className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => onAnswer(true)}>That&apos;s me</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onAnswer(false)}>Not me</Button>
      </span>
    </div>
  );
}

/** The owner's own battle tags on their player page: prompts about earlier players first, then
 *  each tag with its Battle.net mark, "Make main", the W3C link and, on an unverified spare,
 *  remove. Every write answers their row, and the page reads the profile again, because the
 *  header, the address and the MMR follow the main tag. "Verify with Battle.net" leaves for
 *  Blizzard, which sends the browser back with ?bnet=<token> or ?bnet=error. */
export function MyAccounts({ player, onChanged }: { player: { tags?: PlayerTag[] | null }; onChanged: () => Promise<void> }) {
  const playerStore = usePlayerStore();
  const tags: PlayerTag[] = tagsActiveFirst(player.tags ?? []);

  const router = useRouter();
  const searchParams = useSearchParams();
  // the return from Blizzard, read once so it outlives the address clean-up below
  const [bnet] = useState(() => searchParams.get("bnet"));

  const [busy, setBusy] = useState<string | null>(null); // the row a write is out for
  const [pageError, setPageError] = useState<string | null>(() => bnetNote(bnet, searchParams.get("reason")));
  const [done, setDone] = useState<string | null>(null); // the line after a success
  const [adding, setAdding] = useState(false);
  const [typed, setTyped] = useState("");
  const [checking, setChecking] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [prompts, setPrompts] = useState<LinkPrompt[]>([]);

  const loadPrompts = () => playerStore.myPrompts().then(setPrompts, () => setPrompts([]));

  // a ?bnet=<token> return verifies the tag on this login; either way drop ?bnet= from the address
  useEffect(() => {
    const finishing = !!bnet && bnet !== "error" && bnet !== "linked";
    // a Battle.net return reads the prompts after the verify, so a first read cannot land late
    if (!finishing) loadPrompts();
    if (!bnet) return;
    if (finishing) {
      playerStore.finishBnetLink(bnet).then(
        (user) => {
          const tag = verifiedTag(user?.tags, player.tags ?? []);
          setDone(tag ? `Verified ${tag}.` : "Verified.");
          loadPrompts();
          return onChanged();
        },
        (error) => { setPageError((error as Error).message); loadPrompts(); },
      );
    }
    const query = new URLSearchParams(searchParams);
    query.delete("bnet");
    query.delete("reason");
    router.replace(window.location.pathname + (query.size ? `?${query}` : ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = async () => {
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

  const write = async (key: string, run: () => Promise<unknown>) => {
    setBusy(key);
    setPageError(null);
    setDone(null);
    try {
      await run();
      await onChanged();
    } catch (error) {
      setPageError((error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  // only an accepted suggestion changes the profile; the list reloads either way
  const answer = async (prompt: LinkPrompt, accept: boolean) => {
    setBusy(`prompt-${prompt.id}`);
    setPageError(null);
    setDone(null);
    try {
      await playerStore.answerPrompt(prompt.id, accept);
      if (accept) await onChanged();
    } catch (error) {
      setPageError((error as Error).message);
    } finally {
      await loadPrompts();
      setBusy(null);
    }
  };

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const tag = typed.trim();
    setDone(null);
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
      setAdding(false);
      setDone(`Added ${tag}.`);
      await loadPrompts();
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
      </CardTitle>
      <CardContent className="p-0">
        <StatusAlert modelValue={pageError} className="m-4" onClose={() => setPageError(null)} />
        {prompts.map((prompt) => (
          <PromptRow key={prompt.id} prompt={prompt} busy={busy !== null} onAnswer={(accept) => answer(prompt, accept)} />
        ))}
        {tags.map((row) => (
          <div key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-3">
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2 font-medium">
              {row.tag}
              {row.verified ? <BnetVerified /> : <span className="text-sm font-normal text-muted-foreground">Unverified</span>}
              {row.active ? <Badge className={toneClass("primary")}>Main</Badge> : null}
              {busy === `tag-${row.id}` ? <Icon name="mdi-loading mdi-spin" size={16} /> : null}
            </span>
            <span className="flex items-center gap-1">
              {row.active ? null : (
                <Button variant="ghost" size="sm" aria-label={`Make ${row.tag} main`} disabled={busy !== null} onClick={() => write(`tag-${row.id}`, () => playerStore.makeMyTagActive(row.id))}>
                  Make main
                </Button>
              )}
              <Button variant="ghost" size="sm" nativeButton={false} render={<a href={w3cPlayerUrl(row.tag)} target="_blank" rel="noopener noreferrer" aria-label={`${row.tag} on W3Champions`} />}>
                <W3CIcon size={16} />
                W3C
              </Button>
              {/* a verified or main tag stays; make another main first */}
              {!row.active && !row.verified ? (
                <Button variant="ghost" size="icon-sm" aria-label={`Remove ${row.tag}`} disabled={busy !== null} onClick={() => write(`tag-${row.id}`, () => playerStore.removeMyTag(row.id))}>
                  <Icon name="mdi-close" />
                </Button>
              ) : null}
            </span>
          </div>
        ))}
        {adding ? (
          <form className="border-b px-4 py-3" onSubmit={add}>
            <Field label="Battle tag" htmlFor="add-tag" error={fieldError}>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="add-tag"
                  autoFocus
                  className="min-w-0 flex-1"
                  placeholder="Name#1234"
                  value={typed}
                  aria-invalid={!!fieldError}
                  onChange={(event) => { setTyped(event.target.value); setFieldError(null); }}
                />
                <Button type="submit" disabled={checking || !typed.trim()}>Add</Button>
                <Button type="button" variant="ghost" disabled={checking} onClick={() => { setAdding(false); setTyped(""); setFieldError(null); }}>Cancel</Button>
              </div>
            </Field>
            {checking ? (
              <p role="status" className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon name="mdi-loading mdi-spin" size={14} />
                Checking W3Champions
              </p>
            ) : null}
          </form>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <Button variant="outline" disabled={linking} onClick={verify}>
            <Icon name="mdi-check-decagram" size={16} />
            Verify with Battle.net
          </Button>
          {adding ? null : (
            <Button variant="outline" onClick={() => { setAdding(true); setDone(null); }}>
              <Icon name="mdi-plus" size={16} />
              Add a tag
            </Button>
          )}
          {done ? (
            <p role="status" className="flex items-center gap-1.5 text-sm">
              <Icon name="mdi-check" size={16} className="text-success" />
              {done}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default MyAccounts;
