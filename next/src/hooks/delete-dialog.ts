"use client";
import { useState } from "react";

type Action = ((id?: number | string) => void) | null;

/** One confirm-delete dialog state: openDeleteDialog(id, action) stores the action, confirmDelete runs it. */
export function useDeleteDialog() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDeleteItemId, setSelectedDeleteItemId] = useState<number | string | null>(null);
  const [deleteAction, setDeleteAction] = useState<Action>(null);

  const openDeleteDialog = (id: number | string | null, action: Action) => {
    setSelectedDeleteItemId(id);
    setDeleteAction(() => action);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (!deleteAction) return;
    if (selectedDeleteItemId) deleteAction(selectedDeleteItemId);
    else deleteAction();
    setShowDeleteDialog(false);
  };

  const cancelDeleteDialog = () => {
    setShowDeleteDialog(false);
    setSelectedDeleteItemId(null);
    setDeleteAction(null);
  };

  return { showDeleteDialog, selectedDeleteItemId, deleteAction, openDeleteDialog, confirmDelete, cancelDeleteDialog };
}
