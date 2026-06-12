import { useState, useCallback } from 'react';

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant: 'danger' | 'primary';
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {},
    onCancel: () => {},
    variant: 'primary',
  });

  const confirm = useCallback((
    message: string,
    title: string = 'Confirm',
    options?: { confirmText?: string; cancelText?: string; variant?: 'danger' | 'primary' }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title,
        message,
        confirmText: options?.confirmText || 'Confirm',
        cancelText: options?.cancelText || 'Cancel',
        variant: options?.variant || 'primary',
        onConfirm: () => {
          setState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  }, []);

  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return { confirm, state, close };
}

export function ConfirmDialog({ state }: { state: ConfirmDialogState }) {
  if (!state.isOpen) return null;

  const confirmClasses = state.variant === 'danger'
    ? 'bg-red-600 hover:bg-red-500 text-white'
    : 'bg-purple-700 hover:bg-purple-600 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl p-6 w-96 max-w-[90vw] animate-[slideIn_0.2s_ease-out]">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">{state.title}</h3>
        <p className="text-sm text-gray-700 dark:text-gray-400 mb-6">{state.message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={state.onCancel}
            className="px-4 py-2 rounded-md text-sm text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {state.cancelText}
          </button>
          <button
            onClick={state.onConfirm}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${confirmClasses}`}
          >
            {state.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
