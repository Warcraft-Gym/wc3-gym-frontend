"use client";
import { Icon } from "@/components/ui/Icon";
import { eventLabel } from "@/helpers/event-labels.mjs";
import { showDefaultTeamImage, teamImageUrl } from "@/helpers/team-image.js";
import "./trophy.css";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Trophy = Record<string, any>;

/** One trophy: the team's crest, or a cup for a win with no team, over a plate that names the event, under a gold crown. */
export function TrophyIcon({ trophy, size = 44 }: { trophy: Trophy; size?: number }) {
  // Below this the engraved event is too small to read, so the mark shows the crest alone
  const plate = size >= 40;
  const label = eventLabel(trophy);
  // e.g. "GNL · Season 18 champion · CRIT"
  const event = `${label} champion`;
  const title = trophy.team_name ? `${event} · ${trophy.team_name}` : event;
  return (
    <span className="trophy" style={{ "--trophy-size": `${size}px` } as React.CSSProperties} title={title}>
      <Icon name="mdi-crown" className="trophy-crown" size={Math.round(size * 0.55)} />
      {trophy.team_id != null ? (
        <img
          className="trophy-crest"
          src={teamImageUrl({ id: trophy.team_id, icon_url: trophy.team_icon_url })}
          alt={trophy.team_name ?? ""}
          onError={showDefaultTeamImage}
        />
      ) : (
        <span className="trophy-crest trophy-cup">
          <Icon name="mdi-trophy" size={Math.round(size * 0.62)} />
        </span>
      )}
      {plate ? <span className="trophy-plate">{label}</span> : null}
    </span>
  );
}

export default TrophyIcon;
