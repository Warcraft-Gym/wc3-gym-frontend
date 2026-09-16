"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth, useTeamStore } from "@/stores";

type SeatItem = { title: string; value: string; team: string; season: string; first: boolean };

/** An admin sees the app as a lower role. A captain view names the seats it holds. */
export function ViewAsDialog({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const { me, viewAs, setViewAs } = useAuth();
  const teamStore = useTeamStore();
  // the dialog mounts on opening, so it starts from the view in force
  const [viewRole, setViewRole] = useState(() => viewAs?.role ?? "member");
  // "<teamId>:<seasonId>" per chosen seat, the shape the header sends
  const [viewSeats, setViewSeats] = useState<string[]>(() => (viewAs?.seats ?? []).map((seat) => `${seat.teamId}:${seat.seasonId}`));
  const [seatItems, setSeatItems] = useState<SeatItem[]>([]);

  // every team of every season /me lists, so an admin can hold a seat in more than one season
  useEffect(() => {
    let live = true;
    const seasons: { id: number; name: string }[] = me?.seasons ?? [];
    Promise.all(seasons.map((season) => teamStore.getTeamsSeasonBasic(season.id).catch(() => [])))
      .then((rosters) => {
        if (!live) return;
        setSeatItems(
          seasons.flatMap((season, i) =>
            rosters[i].map((team: { id: number; name: string }, j: number) => ({
              title: `${team.name} · ${season.name}`,
              value: `${team.id}:${season.id}`,
              team: team.name,
              season: season.name,
              first: j === 0,
            })),
          ),
        );
      });
    return () => { live = false; };
    // the list is read once per opening, from the session in force then
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyViewAs = () => {
    onOpenChange(false);
    const seats = viewSeats.map((seat) => {
      const item = seatItems.find((row) => row.value === seat);
      const [teamId, seasonId] = seat.split(":");
      return { teamId: Number(teamId), seasonId: Number(seasonId), team: item?.team, season: item?.season };
    });
    setViewAs(viewRole === "captain" ? { role: "captain", seats } : { role: viewRole });
  };

  // one group per season, so a team name repeated across seasons still reads clearly
  const seasonsShown = seatItems.filter((item) => item.first).map((item) => item.season);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>View as</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <ToggleGroup
            className="w-full"
            value={[viewRole]}
            onValueChange={(value) => value[0] && setViewRole(value[0])}
          >
            <ToggleGroupItem value="guest" className="flex-1">Guest</ToggleGroupItem>
            <ToggleGroupItem value="member" className="flex-1">Member</ToggleGroupItem>
            <ToggleGroupItem value="captain" className="flex-1">Captain</ToggleGroupItem>
          </ToggleGroup>
          {viewRole === "captain" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="view-as-seats">Seats</Label>
              <Select
                multiple
                items={seatItems.map(({ title, value }) => ({ label: title, value }))}
                value={viewSeats}
                onValueChange={setViewSeats}
              >
                <SelectTrigger id="view-as-seats" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {seasonsShown.map((season) => (
                    <SelectGroup key={season}>
                      <SelectLabel>{season}</SelectLabel>
                      {seatItems.filter((item) => item.season === season).map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.title}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={viewRole === "captain" && !viewSeats.length} onClick={applyViewAs}>View</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
