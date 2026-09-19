"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { Note } from "@/components/ui/Note";
import { useAuth, useConfigStore } from "@/stores";
import { cn } from "@/lib/utils";

const NO_MEMBERSHIP = "You are signed in, but not a member of the WC3 Gym Discord server yet.";

/** What a guest reads: why the app is closed to him, the invite, and a way to check again. */
export function DiscordJoinCard({ className }: { className?: string }) {
  const { fetchMe } = useAuth();
  const { fetchSettings } = useConfigStore();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(NO_MEMBERSHIP);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchSettings()
      .catch(() => [])
      .then((settings: { key: string; value?: string }[]) => {
        if (alive) setInviteUrl(settings.find((s) => s.key === "discord_invite_url")?.value || null);
      });
    return () => { alive = false; };
  }, [fetchSettings]);

  // the backend reads the Discord role on every request, so /me alone re-checks the membership
  const checkAgain = async () => {
    setChecking(true);
    setMessage(null);
    try {
      await fetchMe(); // a member answer unmounts this card
      setMessage(NO_MEMBERSHIP);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card className={cn("w-full max-w-[500px] gap-0 p-0", className)}>
      <CardHeader className="bg-primary p-4">
        <CardTitle className="text-on-primary">Join the WC3 Gym Discord</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {message ? <Note type={message === NO_MEMBERSHIP ? "info" : "error"}>{message}</Note> : null}
        {inviteUrl ? (
          // Discord brand: blurple
          <Button
            nativeButton={false}
            render={<a href={inviteUrl} target="_blank" rel="noopener noreferrer" />}
            className="mt-4 mr-2 bg-[#5865F2] text-white hover:bg-[#4752C4]"
          >
            Join the Discord
          </Button>
        ) : null}
        <Button variant="ghost" className="mt-4 text-primary-text" disabled={checking} onClick={checkAgain}>
          {checking ? <Icon name="mdi-loading" className="animate-spin" /> : null}
          Check again
        </Button>
      </CardContent>
    </Card>
  );
}

export default DiscordJoinCard;
