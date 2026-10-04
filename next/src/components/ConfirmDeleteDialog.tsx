"use client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";

/** The one ask before a row is deleted, or before anything else that cannot be undone, which
 *  names itself in `title` and `confirmLabel`. The caller owns the open state and the two answers. */
export function ConfirmDeleteDialog({
  modelValue = false,
  message,
  title = "Confirm deletion",
  confirmLabel = "Delete",
  deleteIcon,
  canDelete = true,
  onUpdateModelValue,
  onConfirm,
  onCancel,
}: {
  modelValue?: boolean;
  message: string;
  title?: string;
  confirmLabel?: string;
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
          {title}
        </DialogTitle>
        <div className="p-4">{message}</div>
        <div className="flex justify-end gap-2 p-4 pt-0">
          <Button variant="ghost" onClick={() => onCancel?.()}>
            Cancel
          </Button>
          {canDelete ? (
            <Button variant="destructive" onClick={() => onConfirm?.()}>
              {deleteIcon ? <Icon name={deleteIcon} /> : null}
              {confirmLabel}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmDeleteDialog;
