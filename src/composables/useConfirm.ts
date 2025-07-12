// composables/useConfirm.js
import { reactive } from 'vue';

// Global state - shared across all instances
const globalState = reactive({
    isVisible: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'default', // default, danger, warning, success
    loading: false
});

let resolvePromise = null;

export function useConfirm() {
    const confirm = (options) => {
        return new Promise((resolve) => {
            // Handle both string and object parameters
            if (typeof options === 'string') {
                globalState.title = 'Confirm';
                globalState.message = options;
                globalState.confirmText = 'Confirm';
                globalState.cancelText = 'Cancel';
                globalState.type = 'default';
            } else {
                globalState.title = options.title || 'Confirm';
                globalState.message = options.message || 'Are you sure?';
                globalState.confirmText = options.confirmText || 'Confirm';
                globalState.cancelText = options.cancelText || 'Cancel';
                globalState.type = options.type || 'default';
            }

            globalState.isVisible = true;
            globalState.loading = false;
            resolvePromise = resolve;
        });
    };

    const handleConfirm = async () => {
        globalState.loading = true;

        try {
            // Small delay for better UX
            await new Promise(resolve => setTimeout(resolve, 100));
            globalState.isVisible = false;
            globalState.loading = false;
            resolvePromise(true);
        } catch (error) {
            globalState.loading = false;
            resolvePromise(false);
        }
    };

    const handleCancel = () => {
        globalState.isVisible = false;
        globalState.loading = false;
        resolvePromise(false);
    };

    const handleOverlayClick = () => {
        if (!globalState.loading) {
            handleCancel();
        }
    };

    // Convenience methods for common dialog types
    const confirmDelete = (itemName = 'this item') => {
        return confirm({
            title: 'Delete Confirmation',
            message: `Are you sure you want to delete ${itemName}? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger'
        });
    };

    const confirmSave = (message = 'Do you want to save your changes?') => {
        return confirm({
            title: 'Save Changes',
            message: message,
            confirmText: 'Save',
            cancelText: 'Discard',
            type: 'success'
        });
    };

    const confirmLeave = (message = 'You have unsaved changes. Are you sure you want to leave?') => {
        return confirm({
            title: 'Unsaved Changes',
            message: message,
            confirmText: 'Leave',
            cancelText: 'Stay',
            type: 'warning'
        });
    };

    return {
        state: globalState,
        confirm,
        confirmDelete,
        confirmSave,
        confirmLeave,
        handleConfirm,
        handleCancel,
        handleOverlayClick
    };
}