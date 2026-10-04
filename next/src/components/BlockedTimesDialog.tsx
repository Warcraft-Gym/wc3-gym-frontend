"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/Combobox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { BlockedTimesEditor } from "@/components/BlockedTimesEditor";
import { StatusAlert } from "@/components/StatusAlert";
import { backendUrl, fetchWrapper } from "@/helpers";
import { viewerZone } from "@/helpers/timezone.mjs";
import { authBox, closeBlockedTimes, useAuth, useBlockedTimes } from "@/stores";

// Every write lands back on the session's player row
const patchUser = (part: Record<string, unknown>) => {
  const me = authBox.get().me;
  if (me?.user) authBox.set({ ...authBox.get(), me: { ...me, user: { ...me.user, ...part } } });
};

/** Everything a player answers about time, in the one dialog the app shell holds for every page: the
 *  zone his hours are read in, and the hours he cannot play. It opens over the page he is on, so he is
 *  back where he was when it closes. Full screen on a phone. */
export function BlockedTimesDialog() {
  const { open } = useBlockedTimes();
  const { me } = useAuth();
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [savingZone, setSavingZone] = useState(false);
  // A save changes the rounds the blocks cover, so the page that shows them reads again on close
  const saved = useRef(false);

  // The backend reads the blocks against the profile zone; the editor writes it when the profile carries none
  const profileZone: string | null = me?.user?.timezone ?? null;
  const browserZone = viewerZone();
  // The field shows what is stored, so an empty field reads as the unsaved zone it is
  const [zone, setZone] = useState(profileZone);
  // /me may answer after the shell renders, and every write lands back on the profile
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
      saved.current = true;
    } catch (error) {
      setZoneError((error as Error).message || "Could not save your timezone.");
    } finally {
      setSavingZone(false);
    }
  };

  const close = () => {
    closeBlockedTimes(saved.current);
    saved.current = false;
    setZoneError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : close())}>
      <DialogContent showCloseButton={false} size="md" className="gap-0 p-0">
        <DialogTitle className="flex items-center gap-2 banner bg-banner px-4 py-3 text-primary">
          <Icon name="mdi-calendar-remove" />
          Blocked times
        </DialogTitle>
        <div className="flex flex-col gap-4 p-4">
          <p className="text-sm text-muted-foreground">The hours you cannot play. Open hours are a starting point, not a promise: agree the time with your opponent.</p>
          <StatusAlert modelValue={zoneError} onClose={() => setZoneError(null)} className="mb-0" />
          <Field label="Times are in" htmlFor="blocked-times-zone" hint={profileZone ? undefined : "Saved with your first block."} className="max-w-96">
            <Combobox id="blocked-times-zone" items={zones} value={zone} placeholder={browserZone} disabled={savingZone} onChange={saveZone} className={zone ? undefined : "text-muted-foreground"} />
          </Field>
          {/* mounted only while the dialog is open, so its read waits for the player to ask */}
          <BlockedTimesEditor
            zone={profileZone}
            onZone={onZone}
            onSaved={() => {
              saved.current = true;
            }}
          />
        </div>
        <div className="flex justify-end p-4 pt-0">
          <Button variant="ghost" onClick={close}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BlockedTimesDialog;
