import type { Metadata } from "next";
import { Suspense } from "react";
import { KothNightView } from "./KothNightView";

export const metadata: Metadata = { title: "Run KOTH Night" };

// The view reads ?bounds=1 through useSearchParams, which needs a Suspense boundary
export default async function KothNightPage({ params }: PageProps<"/koth/nights/[id]">) {
  const { id } = await params;
  return (
    <Suspense>
      <KothNightView id={id} />
    </Suspense>
  );
}
