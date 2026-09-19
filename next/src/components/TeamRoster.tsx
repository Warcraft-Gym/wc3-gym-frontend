"use client";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { PlayerName, type Player } from "@/components/PlayerName";

/** The roster of one team in one event: its captains, then its members. Both team pages draw these
 *  two cards; a page that edits the roster fills the render props with its own controls and keeps
 *  the plain lists everywhere else. */
export function TeamRoster({
  captains = [],
  members = [],
  // The empty lines name the run of the league the roster belongs to; a GNL page says season
  noCaptains = "No captains recorded for this event.",
  noMembers = "No members recorded for this event.",
  captainsActions,
  renderCaptains,
  renderMembers,
}: {
  captains?: Player[];
  members?: Player[];
  noCaptains?: string;
  noMembers?: string;
  captainsActions?: React.ReactNode;
  renderCaptains?: (args: { captains: Player[] }) => React.ReactNode;
  renderMembers?: (args: { members: Player[] }) => React.ReactNode;
}) {
  return (
    <>
      <Card className="card mb-4 gap-0 pt-0">
        <CardTitle className="mb-4 flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
          <Icon name="mdi-shield-star" />
          <span>Captains</span>
        </CardTitle>
        {captainsActions}
        <CardContent>
          {renderCaptains ? (
            renderCaptains({ captains })
          ) : captains.length ? (
            <div className="flex flex-wrap gap-3">
              {captains.map((captain) => (
                <PlayerName key={captain.id} player={captain} />
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">{noCaptains}</div>
          )}
        </CardContent>
      </Card>

      <Card className="card gap-0 pt-0">
        <CardTitle className="mb-4 flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
          <Icon name="mdi-account-group" />
          <span>Members</span>
        </CardTitle>
        {renderMembers ? (
          renderMembers({ members })
        ) : (
          <CardContent>
            {members.length ? (
              <div className="flex flex-wrap gap-3">
                {members.map((member) => (
                  <PlayerName key={member.id} player={member} race={member.signup_race ?? undefined} />
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">{noMembers}</div>
            )}
          </CardContent>
        )}
      </Card>
    </>
  );
}

export default TeamRoster;
