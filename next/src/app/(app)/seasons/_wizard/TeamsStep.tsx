/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { NewTeamDialog } from "@/components/admin/NewTeamDialog";
import { PickGrid } from "@/components/admin/PickGrid";
import { StatusAlert } from "@/components/StatusAlert";
import { showDefaultTeamImage, teamImageUrl } from "@/helpers/team-image";

type Row = Record<string, any>;

/** The teams that play the season, ticked from every GNL team. A team missing from the list is
 *  created here and joins the season's list ticked. */
export function TeamsStep({
  teams,
  selected,
  onChange,
  onTeamCreated,
  leaving,
}: {
  teams: Row[];
  selected: number[];
  onChange: (ids: number[]) => void;
  onTeamCreated: (team: Row) => void;
  // the teams the season held that are unticked now
  leaving: Row[];
}) {
  const [newOpen, setNewOpen] = useState(false);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex-1 font-medium">
          {selected.length} {selected.length === 1 ? "team" : "teams"} selected
        </span>
        <Button variant="outline" onClick={() => setNewOpen(true)}>
          <Icon name="mdi-shield-plus" />
          New team
        </Button>
      </div>
      {leaving.length ? (
        <StatusAlert
          type="warning"
          closable={false}
          className="mb-3"
          modelValue={`These teams leave the season when you save: ${leaving.map((team) => team.name).join(", ")}.`}
        />
      ) : null}
      <PickGrid
        items={teams as { id: number; name: string }[]}
        selected={selected}
        onChange={onChange}
        imageOf={(team) => teamImageUrl(team)}
        onImageError={showDefaultTeamImage}
        round
        empty="No teams yet. Create the first one with New team."
      />
      <NewTeamDialog open={newOpen} onOpenChange={setNewOpen} existing={teams} onCreated={onTeamCreated} />
    </div>
  );
}

export default TeamsStep;
