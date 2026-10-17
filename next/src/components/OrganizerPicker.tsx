"use client";
import { useEffect, useRef, useState } from "react";
import { Combobox } from "@/components/ui/Combobox";

/** A player the backend offers as an organizer: one with a Discord login. */
export type OrganizerCandidate = { user_id: number; name: string; discord_tag: string | null; discord_id: string };

// The backend answers from two letters on; the wait keeps a word typed fast to one read
const MIN_LETTERS = 2;
const WAIT_MS = 250;

/** Picks one player from the player base by name or Discord tag, for an organizer to add. `search`
 *  is the guarded read that answers the matches, ten at most, past the ones already holding the role. */
export function OrganizerPicker({
  search,
  picked,
  onPick,
  id,
  disabled,
}: {
  search: (q: string) => Promise<OrganizerCandidate[]>;
  picked: OrganizerCandidate | null;
  onPick: (candidate: OrganizerCandidate | null) => void;
  id?: string;
  disabled?: boolean;
}) {
  const [found, setFound] = useState<OrganizerCandidate[]>([]);
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // the answer to an older text never replaces the answer to a newer one
  const latest = useRef("");

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onSearch = (next: string) => {
    setText(next);
    latest.current = next;
    if (timer.current) clearTimeout(timer.current);
    if (next.trim().length < MIN_LETTERS) {
      setFound([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const rows = await search(next.trim());
        if (latest.current !== next) return;
        setFailed(false);
        setFound(rows ?? []);
      } catch {
        if (latest.current === next) setFailed(true);
      }
    }, WAIT_MS);
  };

  // the picked player stays an item, so the button still names them after the next search
  const rows = picked && !found.some((one) => one.discord_id === picked.discord_id) ? [picked, ...found] : found;
  const items = rows.map((one) => ({ value: one.discord_id, title: one.name, tag: one.discord_tag ?? "", candidate: one }));
  const empty = failed
    ? "The search failed. Try again."
    : text.trim().length < MIN_LETTERS
      ? "Type 2 letters of a name or Discord tag"
      : "No player matches";

  return (
    <Combobox
      id={id}
      label="Search a player"
      placeholder="Name or Discord tag"
      empty={empty}
      disabled={disabled}
      items={items}
      value={picked?.discord_id ?? null}
      onSearch={onSearch}
      onChange={(value) => onPick(items.find((item) => item.value === value)?.candidate ?? null)}
      // one line, so the chosen player fits the button as well as the list
      row={(item) => (
        <span className="flex min-w-0 items-baseline gap-1.5 text-left">
          <span className="truncate">{item.title}</span>
          {item.tag ? <span className="truncate text-xs text-muted-foreground">{item.tag}</span> : null}
        </span>
      )}
    />
  );
}

export default OrganizerPicker;
