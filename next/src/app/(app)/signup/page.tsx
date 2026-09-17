import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicSignupView } from "./PublicSignupView";

export const metadata: Metadata = { title: "Signup" };

export default function SignupPage() {
  return (
    <Suspense>
      <PublicSignupView />
    </Suspense>
  );
}
