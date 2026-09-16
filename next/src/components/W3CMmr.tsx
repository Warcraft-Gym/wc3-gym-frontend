"use client";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/hooks/theme";
import w3cLogo from "@/assets/media/w3c-logo.png";
import w3cLogoWhite from "@/assets/media/w3c-logo-white.png";

/** The "W3C MMR" column label: the W3Champions W3C mark ahead of the word MMR.
 *  Source of the mark in src/assets/media/README.md. */
export function W3CMmr({ suffix = "", sortIcon = null }: { suffix?: string; sortIcon?: string | null }) {
  // The dark-ink mark is made for the light theme; the dark theme takes the white original.
  const { activeTheme } = useTheme();
  const logo = activeTheme === "dark" ? w3cLogoWhite : w3cLogo;
  return (
    <span className="inline-flex items-baseline whitespace-nowrap">
      <img src={logo.src} alt="W3C" className="mr-1 h-[1.4em] shrink-0 translate-y-[3%] object-contain align-baseline" />
      <span>MMR{suffix}</span>
      {sortIcon ? <Icon name={sortIcon} size={12} className="ml-1" /> : null}
    </span>
  );
}

export default W3CMmr;
