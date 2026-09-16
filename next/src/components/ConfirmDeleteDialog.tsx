"use client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";

/** The one ask before a row is deleted. The caller owns the open state and the two answers. */
export function ConfirmDeleteDialog({
  modelValue = false,
  message,
  deleteIcon,
  canDelete = true,
  onUpdateModelValue,
  onConfirm,
  onCancel,
}: {
  modelValue?: boolean;
  message: string;
  deleteIcon?: string;
  canDelete?: boolean;
  onUpdateModelValue?: (open: boolean) => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}) {
  return (
    <Dialog open={modelValue} onOpenChange={(open) => onUpdateModelValue?.(open)}>
      <DialogContent showCloseButton={false} className="max-w-[400px] gap-0 p-0 sm:max-w-[400px]">
        {/* DESIGN.md: a dialog that deletes something wears bg-error */}
        <DialogTitle className="flex items-center gap-2 bg-error px-4 py-3 text-on-error">
          <Icon name="mdi-alert" />
          Confirm deletion
        </DialogTitle>
        <div className="p-4">{message}</div>
        <div className="flex justify-end gap-2 p-4 pt-0">
          <Button variant="ghost" onClick={() => onCancel?.()}>
            Cancel
          </Button>
          {canDelete ? (
            <Button variant="destructive" onClick={() => onConfirm?.()}>
              {deleteIcon ? <Icon name={deleteIcon} /> : null}
              Delete
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmDeleteDialog;
