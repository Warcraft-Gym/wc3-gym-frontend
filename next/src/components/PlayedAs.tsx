import { playedAsTag } from "@/helpers/tags.mjs";
import { cn } from "@/lib/utils";

/** The quiet "as TAG" line under a season row: the tag the season was played as,
 *  shown only when it differs from the person's tag today. */
export function PlayedAs({ playedAs, battleTag, className }: { playedAs?: string | null; battleTag?: string | null; className?: string }) {
  const tag = playedAsTag(playedAs, battleTag);
  return tag ? <span className={cn("block text-xs text-muted-foreground", className)}>as {tag}</span> : null;
}

export default PlayedAs;
