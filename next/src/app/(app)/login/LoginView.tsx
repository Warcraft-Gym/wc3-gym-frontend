"use client";
import { useState } from "react";
import { useAuth as useClerk, useSignIn } from "@clerk/clerk-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { StatusAlert } from "@/components/StatusAlert";
import { useAuth } from "@/stores";
import { discordMark } from "@/assets/discordMark.js";

const REDIRECT_TIMEOUT = 15000; // Discord not reached by then is a failure, not a slow network

/** The sign-in page. U5 adds the /sso-callback handshake and the join card. */
export function LoginView() {
  const { signIn } = useSignIn();
  const { isLoaded, isSignedIn } = useClerk();
  const { loginError, logout, setLoginError } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false); // stays on until the browser leaves for Discord
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-[500px] gap-0 p-0">
        <CardHeader className="bg-primary p-4">
          <CardTitle className="flex items-center gap-2 text-on-primary">
            <Icon name="mdi-lock" />
            GNL Login
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* a session that /me has not answered yet waits here too, so the button never flashes */}
          {isSignedIn ? (
            <div className="py-4 text-center">
              <div>Signing you in…</div>
            </div>
          ) : (
            <>
              {error || loginError ? (
                <StatusAlert modelValue={error || loginError} retry={reset} />
              ) : null}
              <Button
                className="w-full bg-[#5865F2] text-white hover:bg-[#4752C4]"
                disabled={isRedirecting || !isLoaded}
                onClick={loginWithDiscord}
              >
                <svg className="mr-3 size-6" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d={discordMark} />
                </svg>
                Sign in with Discord
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginView;
