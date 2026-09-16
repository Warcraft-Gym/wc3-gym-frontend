"use client";
import { ClerkProvider } from "@clerk/clerk-react";

/** `@clerk/clerk-react` is browser-only, so the root layout mounts it through this leaf. */
export function AppClerkProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ""}
      proxyUrl={process.env.NEXT_PUBLIC_CLERK_PROXY_URL}
      // the Account Portal does not exist on a vercel.app production domain; every flow stays on /login
      signInUrl="/login"
      signUpUrl="/login"
      afterSignOutUrl="/login"
    >
      {children}
    </ClerkProvider>
  );
}
