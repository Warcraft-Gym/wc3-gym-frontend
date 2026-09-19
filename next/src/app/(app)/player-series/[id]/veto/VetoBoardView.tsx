"use client";
import { Icon } from "@/components/ui/Icon";
import { VetoBoard } from "@/components/VetoBoard";

/** The map veto of one series on a page of its own. */
export function VetoBoardView({ id }: { id: string }) {
  return (
    <div className="p-4">
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
