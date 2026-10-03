"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useConfigStore } from "@/stores";

/** The dashboard is still being built, so every page but a stream carries one line that sends a reader,
 *  signed in or not, to the community: the main WC3 Gym Discord, at the invite Config names. */
export function ConstructionBanner() {
  const { fetchSettings } = useConfigStore();
  const [invite, setInvite] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchSettings()
      .catch(() => [])
      .then((settings: { key: string; value?: string }[]) => {
        if (alive) setInvite(settings.find((s) => s.key === "discord_invite_url")?.value || null);
      });
    return () => {
      alive = false;
    };
  }, [fetchSettings]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-primary/40 bg-banner px-3 py-1.5 text-sm text-on-banner">
      <span className="inline-flex items-center gap-1.5">
        <Icon name="mdi-hammer-wrench" size={16} className="text-primary" />
        WC3 Gym Dashboard is under construction.
      </span>
      {/* no invite set in Config, no link: the line still says what the dashboard is */}
      {invite ? (
        <a href={invite} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-primary no-underline hover:underline">
          <Icon name="mdi-account-group" size={16} />
          Join the Gym
        </a>
      ) : null}
    </div>
  );
}

export default ConstructionBanner;
