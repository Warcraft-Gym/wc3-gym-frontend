"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { PlayerProfile } from "@/components/player/PlayerProfile";
import { PanelLinksContext, panelPlayerKey, usePanelPlayerKey } from "@/hooks/player-panel";
import { canSeeRole } from "@/lib/routes";
import { useAuth } from "@/stores";

/** The player profile as a sheet on the right edge, over whatever page you are
 *  on. It sits above the page's own dialogs, so it also opens over the Report
 *  Result dialog and the Propose Series dialog. */
export function PlayerPanel() {
  const router = useRouter();
  const { me } = useAuth();
  const key = usePanelPlayerKey();

  // the key is already the address, whether it is a battle tag or an id
  const fullPage = `/player/${encodeURIComponent(key || "")}`;

  // A profile is member-only, and the route guard reads a missing session, not a
  // role. Anyone the panel refuses goes to the page instead, where that guard
  // sends him to the login, exactly as a name click did before the panel.
  const mayRead = !!me && canSeeRole(me.role, "member");
  const open = !!key && mayRead;
  useEffect(() => {
    if (!key || mayRead) return;
    panelPlayerKey.set(null);
    router.push(fullPage);
  }, [key, mayRead, fullPage, router]);

  return (
    <Sheet open={open} onOpenChange={(value) => { if (!value) panelPlayerKey.set(null); }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[560px] max-w-full gap-0 p-0 motion-reduce:transition-none sm:max-w-[560px]"
      >
        <SheetTitle className="sr-only">Player profile</SheetTitle>
        {open ? (
          // a name inside the panel swaps the panel, so the page under it keeps its work
          <PanelLinksContext.Provider value>
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
                <Button variant="ghost" size="icon" aria-label="Close" onClick={() => panelPlayerKey.set(null)}>
                  <Icon name="mdi-close" />
                </Button>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={fullPage} onClick={() => panelPlayerKey.set(null)} />}
                >
                  Open full page
                  <Icon name="mdi-open-in-new" />
                </Button>
              </div>
              <div className="grow overflow-y-auto p-4">
                <PlayerProfile playerKey={key as string} />
              </div>
            </div>
          </PanelLinksContext.Provider>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export default PlayerPanel;
