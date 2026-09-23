"use client";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { seasonBox, useSeason } from "@/stores";
import { loadSeasons, resolveCurrentSeasonId } from "@/helpers/current-season.js";
import { eventLabel } from "@/helpers/event-labels.mjs";
import { byNewest } from "@/helpers/season-order.mjs";
import { findSeason } from "@/helpers/season-slug.mjs";

type Season = { id: number; name: string };

/** One pick for every page that shows a season: the box carries it between routes, ?season= across a reload. */
export function SeasonSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { seasons, selectedSeasonId, setSelectedSeasonId, slugOf } = useSeason();

  useEffect(() => {
    (async () => {
      const list: Season[] = await loadSeasons();
      const fromUrl = findSeason(list, searchParams.get("season"));
      if (fromUrl) setSelectedSeasonId(fromUrl.id);
      else if (!list.some((season) => season.id === seasonBox.get().selectedSeasonId)) setSelectedSeasonId(await resolveCurrentSeasonId());
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The URL follows the pick, so a reload and a shared link open the same season
  useEffect(() => {
    if (!selectedSeasonId || !seasons.length) return;
    const slug = slugOf(selectedSeasonId);
    if (searchParams.get("season") === slug) return;
    const query = new URLSearchParams(searchParams.toString());
    query.set("season", slug);
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeasonId, seasons.length]);

  // Newest season first, by start date, never by store order
  const ordered = [...seasons].sort(byNewest);

  return (
    <Select
      items={ordered.map((season) => ({ value: season.id, label: eventLabel(season) }))}
      value={selectedSeasonId}
      onValueChange={(value) => setSelectedSeasonId(value as number | null)}
    >
      <SelectTrigger aria-label="Season" className="w-full min-w-[200px]">
        <SelectValue placeholder="Season" />
      </SelectTrigger>
      <SelectContent>
        {ordered.map((season) => (
          <SelectItem key={season.id} value={season.id}>
            {eventLabel(season)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default SeasonSelect;
