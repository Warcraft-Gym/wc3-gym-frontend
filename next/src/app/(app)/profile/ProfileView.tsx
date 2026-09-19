"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DiscordJoinCard } from "@/components/DiscordJoinCard";
import { profileState } from "@/helpers/profile.mjs";
import { playerPath } from "@/helpers/players.mjs";
import { useAuth } from "@/stores";
import { PublicSignupView } from "../signup/PublicSignupView";

/** The profile body a signed-in viewer sees: the join card, the signup form, or his player page. */
export function ProfileView() {
  const router = useRouter();
  const { me } = useAuth();
  const state = profileState(me);
  // a member with a player row reads his profile at his own player page
  useEffect(() => {
    if (state === "dashboard") router.replace(playerPath(me!.user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (state === "guest") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-4">
        <DiscordJoinCard />
      </div>
    );
  }
  return state === "signup" ? <PublicSignupView /> : null;
}

export default ProfileView;
