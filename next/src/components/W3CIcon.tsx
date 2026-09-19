import w3cLogo from "@/assets/media/w3champions.png";
import { cn } from "@/lib/utils";

/** The w3champions crown, their own artwork, marking what comes from w3champions
 *  rather than from the GNL series. Source in src/assets/media/README.md. */
export function W3CIcon({ size = 24, className }: { size?: number | string; className?: string }) {
  return <img src={w3cLogo.src} width={size} height={size} alt="W3Champions" className={cn("shrink-0 object-contain align-middle", className)} />;
}

export default W3CIcon;
