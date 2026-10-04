"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { VetoBoard } from "@/components/VetoBoard";

/** The map veto of one series on a page of its own, with the way back to Home, where the player's
 *  season tasks live. */
export function VetoBoardView({ id }: { id: string }) {
  return (
    <div className="p-4">
      <Button variant="ghost" size="sm" className="mb-2 text-primary-text" nativeButton={false} render={<Link href="/" />}>
        <Icon name="mdi-arrow-left" />
        Home
      </Button>
      <VetoBoard key={id} seriesId={id}>
        <h1 className="flex items-center gap-2">
          <Icon name="mdi-map-outline" />
          Map Veto
        </h1>
      </VetoBoard>
    </div>
  );
}

export default VetoBoardView;
