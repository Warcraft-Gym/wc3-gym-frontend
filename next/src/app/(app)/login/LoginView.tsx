"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthenticateWithRedirectCallback, useAuth as useClerk, useSignIn } from "@clerk/clerk-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Note } from "@/components/ui/Note";
import { DiscordJoinCard } from "@/components/DiscordJoinCard";
import { useAuth } from "@/stores";
import { discordMark } from "@/assets/discordMark.js";
import { clerkEnabled } from "@/lib/clerk-provider";

const REDIRECT_TIMEOUT = 15000; // Discord not reached by then is a failure, not a slow network

/** The sign-in page. /login and /sso-callback share it, so the path says which one is mounted. */
export function LoginView() {
  return clerkEnabled ? <DiscordLoginView /> : <AdminOnlyLoginView />;
}

/** Without a Clerk key there is no Discord sign-in; the admin token is the only way in. */
function AdminOnlyLoginView() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-[500px] gap-0 p-0">
        <CardHeader className="bg-primary p-4">
          <CardTitle className="flex items-center gap-2 text-on-primary">
            <Icon name="mdi-lock" />
            Log in to WC3 Gym Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Note type="info" className="mb-4">
            Discord sign-in needs <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>. Without it, sign in with the admin token.
          </Note>
          <Button nativeButton={false} size="lg" className="h-11 w-full text-base" render={<Link href="/admin-login" />}>
            Admin token login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function DiscordLoginView() {
  const { signIn } = useSignIn();
  const { isLoaded, isSignedIn } = useClerk();
  const { me, loginError, logout, setLoginError } = useAuth();
  const router = useRouter();
  const isCallback = usePathname() === "/sso-callback";
  const [isRedirecting, setIsRedirecting] = useState(false); // stays on until the browser leaves for Discord
  const [error, setError] = useState<string | null>(null);

  // Only a handshake in flight belongs on /sso-callback. The Back button after a sign-in
  // lands here with the session already live, and Clerk then sends the browser to its own
  // hosted portal, off the app; the login page takes it from here instead.
  useEffect(() => {
    if (isCallback && isLoaded && isSignedIn) router.replace("/login");
  }, [isCallback, isLoaded, isSignedIn, router]);

  const fail = (message: string) => {
    setIsRedirecting(false);
    setError(message);
  };

  const loginWithDiscord = async () => {
    setIsRedirecting(true);
    setError(null);
    const timer = setTimeout(() => fail("Discord did not answer."), REDIRECT_TIMEOUT);
    try {
      await signIn?.authenticateWithRedirect({
        strategy: "oauth_discord",
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: `${window.location.origin}/login`,
      });
    } catch (e) {
      clearTimeout(timer);
      const err = e as { errors?: { longMessage?: string }[]; message?: string };
      fail(err?.errors?.[0]?.longMessage || err?.message || "Sign-in failed.");
    }
  };

  // drop the session Clerk still holds, so the button comes back
  const reset = () => {
    setError(null);
    setLoginError(null);
    logout();
  };

  const loading = isRedirecting || !isLoaded;
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-[500px] gap-0 p-0">
        <CardHeader className="bg-primary p-4">
          <CardTitle className="flex items-center gap-2 text-on-primary">
            <Icon name="mdi-lock" />
            Log in to WC3 Gym Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Discord's consent page comes back to /sso-callback, which Clerk finishes here;
              a session that /me has not answered yet waits here too, so the button never flashes */}
          {isCallback || isSignedIn ? (
            <div className="py-4 text-center">
              <div className="mx-auto mb-3 size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" role="status" aria-label="Loading" />
              <div>Signing you in…</div>
              {isCallback && !isSignedIn ? <AuthenticateWithRedirectCallback signInFallbackRedirectUrl="/login" signUpFallbackRedirectUrl="/login" /> : null}
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
          {!isCallback && !isSignedIn ? (
            // Discord brand: blurple, white Clyde mark, sentence case
            <Button size="lg" className="h-11 w-full bg-[#5865F2] text-base text-white hover:bg-[#4752C4]" disabled={loading} aria-busy={loading} onClick={loginWithDiscord}>
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
