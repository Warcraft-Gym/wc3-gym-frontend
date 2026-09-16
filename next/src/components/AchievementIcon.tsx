"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useSeason } from "@/stores";
import { cn } from "@/lib/utils";

// The rule glyphs, served from public/achievementIcons and named after their rule id
const GLYPHS = new Set(
  `addicted always_here anti_random bragging_rights captains_duty civil_war climber comeback dats_fakt_ap
   double_up duck_hunting early_bird elite every_week everyone_hunts everyone_scores falling_star fast_start
   fifty_faces first_to_fifty five_a_day four_horsemen full_roster games_100 games_25 games_50 grand_tour
   half_regular hat_trick hold_the_line holiday home_turf human hunting_season i_am_the_captain_now join_them
   ladder_goal last_call lose_first map_win marathon mirror_master month_of_sundays nemesis never_blank
   never_gone newbie night_elf nobody_left off_duty one_sitting open_season orc plus_twenty power_hour
   race_tour repeat_offender revenge rising_star rival sad_trombone slayer_hu slayer_ne slayer_oc slayer_ud
   sparring_partners speedrunner streak_week team_climb team_goal team_grand_tour team_map_coverage
   team_night team_race_coverage tourist twenty_days twenty_hours two_hundred undead week_one
   weekend_warrior weekly_regular welcome_back wide_net win_every_map win_first win_pool win_streak
   win_streak_2 winner_winner winter`.split(/\s+/),
);

/** One badge glyph from game-icons.net, tinted by the surrounding text color; a map badge draws its map's picture */
export function AchievementIcon({ id, size = 20, className }: { id: string; size?: number; className?: string }) {
  const { seasons } = useSeason();
  // Map pictures by map name, from the season list every page loads
  const pictures = new Map(seasons.flatMap((season) => season.maps ?? []).map((map: { name: string; image: string }) => [map.name, map.image]));

  // A per-map badge (`map_win:<map>`) draws its map's picture; the rule glyph when the picture is missing
  const [broken, setBroken] = useState(false);
  const [rule, ...rest] = id.split(":");
  const picture = rule === "map_win" && !broken ? pictures.get(rest.join(":")) : null;
  const glyph = GLYPHS.has(id) ? id : GLYPHS.has(rule) ? rule : null;

  if (picture)
    return (
      <img
        src={picture}
        alt={id}
        className={cn("inline-flex shrink-0 rounded-[3px] object-cover", className)}
        style={{ width: size, height: size }}
        onError={() => setBroken(true)}
      />
    );
  if (glyph) {
    // The glyph is a single currentColor path, so a mask paints it in the surrounding text color
    const mask = `url(/achievementIcons/${glyph}.svg) center / contain no-repeat`;
    return <span role="img" aria-label={id} className={cn("inline-flex shrink-0 bg-current", className)} style={{ width: size, height: size, mask, WebkitMask: mask }} />;
  }
  return <Icon name="mdi-trophy-variant-outline" size={size} className={className} />;
}

export default AchievementIcon;
