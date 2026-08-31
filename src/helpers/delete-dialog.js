import { ref } from 'vue';

// One confirm-delete dialog state: openDeleteDialog(id, action) stores the action, confirmDelete runs it
export function useDeleteDialog() {
  const showDeleteDialog = ref(false);
  const selectedDeleteItemId = ref(null);
  const deleteAction = ref(null);

  const openDeleteDialog = (id, action) => {
    selectedDeleteItemId.value = id;
    deleteAction.value = action;
    showDeleteDialog.value = true;
  };

  const confirmDelete = () => {
    if (!deleteAction.value) return;
    if (selectedDeleteItemId.value) {
      deleteAction.value(selectedDeleteItemId.value);
    } else {
      deleteAction.value();
    }
    showDeleteDialog.value = false;
  };

  const cancelDeleteDialog = () => {
    showDeleteDialog.value = false;
    selectedDeleteItemId.value = null;
    deleteAction.value = null;
  };

  return { showDeleteDialog, selectedDeleteItemId, deleteAction, openDeleteDialog, confirmDelete, cancelDeleteDialog };
}
