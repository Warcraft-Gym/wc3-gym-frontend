import w3cLogo from "@/assets/media/w3champions.png";

/** The w3champions crown, their own artwork, marking what comes from w3champions
 *  rather than from the GNL series. Source in src/assets/media/README.md. */
export function W3CIcon({ size = 24 }: { size?: number | string }) {
  return <img src={w3cLogo.src} width={size} height={size} alt="W3Champions" className="shrink-0 object-contain align-middle" />;
}

export default W3CIcon;
