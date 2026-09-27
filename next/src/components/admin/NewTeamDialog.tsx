/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { StatusAlert } from "@/components/StatusAlert";
import { useTeamStore } from "@/stores";

type Row = Record<string, any>;

/** A new GNL team, with its icon. A name the league already holds is refused before the write.
 *  A team stored without its icon still counts as created: onCreated gets it and the dialog
 *  says the icon is missing, so it can be uploaded later on the Teams page. */
export function NewTeamDialog({
  open,
  onOpenChange,
  onCreated,
  existing = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (team: Row) => Promise<unknown> | void;
  existing?: Row[];
}) {
  const teamStore = useTeamStore();
  const [team, setTeam] = useState({ name: "", long_name: "" });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setTeam({ name: "", long_name: "" });
    setFile(null);
    setError(null);
    onOpenChange(false);
  };

  const create = async () => {
    setError(null);
    const name = team.name.trim();
    if (existing.some((row) => String(row.name).toLowerCase() === name.toLowerCase())) {
      setError(`A team named ${name} already exists.`);
      return;
    }
    setSaving(true);
    try {
      const created = await teamStore.createTeam({ ...team, name });
      let iconFailed: string | null = null;
      if (file) {
        try {
          await teamStore.uploadTeamImage(created.id, file, created.league_id);
        } catch (err) {
          console.error("Error uploading team icon:", err);
          iconFailed = (err as Error).message;
        }
      }
      await onCreated(created);
      if (iconFailed) setError(`Team created, but the icon upload failed: ${iconFailed}`);
      else close();
    } catch (err) {
      console.error("Error creating the team:", err);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent showCloseButton={false} className="max-w-[600px] gap-0 p-0 md:max-w-[600px]">
        <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
          <Icon name="mdi-shield-plus" />
          New team
        </DialogTitle>
        <div className="p-4 pb-0">
          <StatusAlert modelValue={error} onClose={() => setError(null)} />
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <Field label="Team name" htmlFor="new-team-name">
            <Input id="new-team-name" value={team.name} onChange={(e) => setTeam({ ...team, name: e.target.value })} />
          </Field>
          <Field label="Team long name" htmlFor="new-team-long-name">
            <Input id="new-team-long-name" value={team.long_name} onChange={(e) => setTeam({ ...team, long_name: e.target.value })} />
          </Field>
          <Field label="Team icon" htmlFor="new-team-icon" hint="PNG or JPG">
            <Input id="new-team-icon" type="file" accept=".png,.jpg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 p-4 pt-0">
          <Button variant="ghost" onClick={close}>
            {error?.startsWith("Team created") ? "Close" : "Cancel"}
          </Button>
          <Button disabled={!team.name.trim() || saving || !!error?.startsWith("Team created")} onClick={create}>
            <Icon name={saving ? "mdi-loading mdi-spin" : "mdi-plus"} />
            Create team
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NewTeamDialog;
