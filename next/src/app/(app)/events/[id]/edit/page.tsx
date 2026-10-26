import type { Metadata } from "next";
import { Suspense } from "react";
import { CupEditView } from "./CupEditView";

export const metadata: Metadata = { title: "Edit Cup" };

// the view reads its step from the address, so it renders inside a Suspense boundary
export default async function CupEditPage({ params }: PageProps<"/events/[id]/edit">) {
  const { id } = await params;
  return (
    <Suspense>
      <CupEditView id={id} />
    </Suspense>
  );
}
