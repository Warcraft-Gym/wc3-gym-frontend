"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/Combobox";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { BlockedTimesEditor } from "@/components/BlockedTimesEditor";
import { BlockedRounds } from "./BlockedRounds";
import { PageHeader } from "@/components/PageHeader";
import { StatusAlert } from "@/components/StatusAlert";
import { backendUrl, fetchWrapper } from "@/helpers";
import { viewerZone } from "@/helpers/timezone.mjs";
import { authBox, useAuth } from "@/stores";

// Every write lands back on the session's player row
const patchUser = (part: Record<string, unknown>) => {
  const me = authBox.get().me;
  if (me?.user) authBox.set({ ...authBox.get(), me: { ...me, user: { ...me.user, ...part } } });
};

/** Everything a player answers about time: the zone his hours are read in, and
 *  the hours he cannot play. */
export function AvailabilityView() {
  const { me } = useAuth();
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [savingZone, setSavingZone] = useState(false);

  // The backend reads the blocks against the profile zone; the editor writes it when the profile carries none
  const profileZone: string | null = me?.user?.timezone ?? null;
  const browserZone = viewerZone();
  // The field shows what is stored, so an empty field reads as the unsaved zone it is
  const [zone, setZone] = useState(profileZone);
  // /me may answer after the page renders, and every write lands back on the profile
  const [seenProfileZone, setSeenProfileZone] = useState(profileZone);
  if (seenProfileZone !== profileZone) {
    setSeenProfileZone(profileZone);
    setZone(profileZone);
  }
  const zones = [...new Set([...Intl.supportedValuesOf("timeZone"), zone].filter(Boolean) as string[])].map((value) => ({ value, title: value }));

  // The editor wrote the browser zone, so the field and the profile follow it
  const onZone = (timezone: string) => {
    setZone(timezone);
    patchUser({ timezone });
  };

  const saveZone = async (timezone: string | null) => {
    setZone(timezone);
    setSavingZone(true);
    setZoneError(null);
    try {
      const { user } = await fetchWrapper.put(`${backendUrl}/user-info`, { timezone });
      patchUser(user);
    } catch (error) {
      setZoneError((error as Error).message || "Could not save your timezone.");
    } finally {
      setSavingZone(false);
    }
  };

  return (
    <div className="mx-auto max-w-[900px] p-4">
      <PageHeader title="Availability" lead="Open hours are a starting point, not a promise. Agree the time with your opponent." />

      <StatusAlert modelValue={zoneError} onClose={() => setZoneError(null)} />
      <Field label="Times are in" htmlFor="availability-zone" hint={profileZone ? undefined : "Saved with your first block."} className="mb-6 max-w-96">
        <Combobox id="availability-zone" items={zones} value={zone} placeholder={browserZone} disabled={savingZone} onChange={saveZone} className={zone ? undefined : "text-muted-foreground"} />
      </Field>

      <Card className="gap-0 p-0">
        <CardHeader className="bg-primary p-4">
          <CardTitle className="flex items-center gap-2 text-on-primary">
            <Icon name="mdi-calendar-remove" />
            When you can&apos;t play
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <BlockedTimesEditor zone={profileZone} onZone={onZone} />
        </CardContent>
      </Card>

      {/* The answer itself belongs to the round, so this list only reads */}
      <BlockedRounds />
    </div>
  );
}

export default AvailabilityView;
