"use client";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Kit } from "./Kit";

export function CreditsView() {
  // ?kit=1 opens the component kit section.
  const kit = useSearchParams().get("kit") === "1";
  return (
    <div className="mx-auto max-w-[700px] p-4">
      <PageHeader title="Credits" />

      <h2 className="mb-2 text-lg">Graphics and image sources</h2>
      <ul className="ml-6 list-disc">
        <li>
          Warcraft III race icons: © <a href="https://www.blizzard.com" target="_blank" rel="noopener">Blizzard Entertainment</a>
        </li>
        <li>
          Achievement and bet icons: <a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a> by Lorc, Delapouite and Caro Asercion,{" "}
          <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>
        </li>
        <li>
          W3Champions crown and wordmarks: <a href="https://w3champions.com" target="_blank" rel="noopener">W3Champions</a>
        </li>
        <li>
          Country flags: <a href="https://flagpack.xyz" target="_blank" rel="noopener">Flagpack</a>
        </li>
      </ul>

      {kit ? (
        <section id="kit">
          <Kit />
        </section>
      ) : null}
    </div>
  );
}

export default CreditsView;
