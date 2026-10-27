"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Note } from "@/components/ui/Note";
import { DiscordJoinCard } from "@/components/DiscordJoinCard";
import { backendUrl } from "@/helpers";
import { useAuth } from "@/stores";
import { discordMark } from "@/assets/discordMark.js";

// why the backend's Discord callback sent the browser back to /login?login=error&reason=
const FAILED: Record<string, string> = {
  denied: "Sign-in was cancelled on Discord.",
  state: "The sign-in took too long. Try again.",
  token: "Discord did not accept the sign-in. Try again.",
};

/** The sign-in page. /login and /sso-callback share it, so the path says which one is mounted. */
export function LoginView() {
  const { me, loginError, logout, setLoginError, signIn } = useAuth();
  const router = useRouter();
  const isCallback = usePathname() === "/sso-callback";
  const [isRedirecting, setIsRedirecting] = useState(false); // stays on until the browser leaves for Discord
  // the Guard mounts this page only after hydration, so the address is readable on the first render
  const [error, setError] = useState<string | null>(() => {
    const query = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
    return query.get("login") === "error" ? (FAILED[query.get("reason") ?? ""] ?? "Sign-in failed.") : null;
  });

  // /sso-callback carries the session token in the fragment; it leaves the address bar and the
  // history at once, and the route guard leaves /login for the saved path once /me answers
  useEffect(() => {
    if (!isCallback) return;
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    window.history.replaceState(null, "", window.location.pathname);
    if (!token) return router.replace("/login");
    signIn(token)
      .catch((e: Error) => setLoginError(e.message))
      .finally(() => router.replace("/login"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCallback]);

  const loginWithDiscord = () => {
    setIsRedirecting(true);
    setError(null);
    // the backend's route, not a page: locally NEXT_PUBLIC_BACKEND_URL is the relative /api proxy
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `${backendUrl}/auth/discord/start`;
  };

  // drop the session the browser still holds, so the button comes back
  const reset = () => {
    setError(null);
    setLoginError(null);
    logout();
  };

  const loading = isRedirecting;
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-[500px] gap-0 p-0">
        <CardHeader className="banner bg-banner p-4">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Icon name="mdi-lock" />
            Log in to WC3 Gym Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* the backend's Discord callback comes back to /sso-callback, which signs in here */}
          {isCallback ? (
            <div className="py-4 text-center">
              <div className="mx-auto mb-3 size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" role="status" aria-label="Loading" />
              <div>Signing you in…</div>
            </div>
          ) : error || loginError ? (
            <Note
              type="error"
              className="mb-4"
              action={
                <Button variant="ghost" size="sm" onClick={reset}>
                  Reset and retry
                </Button>
              }
            >
              {error || loginError}
            </Note>
          ) : null}
          {!isCallback && !me ? (
            // Discord brand: blurple, white Clyde mark, sentence case
            <Button size="lg" className="h-11 w-full bg-[#5865F2] bg-none shadow-none text-base text-white hover:bg-[#4752C4]" disabled={loading} aria-busy={loading} onClick={loginWithDiscord}>
              {loading ? (
                <Icon name="mdi-loading" size={24} className="mr-3 animate-spin" />
              ) : (
                <svg className="mr-3 size-6" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d={discordMark} />
                </svg>
              )}
              Sign in with Discord
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {/* a signed-in session with no guild membership is a guest, and reads why here */}
      {me?.role === "guest" ? <DiscordJoinCard className="mt-4" /> : null}
    </div>
  );
}

export default LoginView;
