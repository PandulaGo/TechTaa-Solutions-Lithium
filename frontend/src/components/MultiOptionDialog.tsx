import { useState, useCallback } from 'react';

export type MultiOptionResult = 'option1' | 'option2' | 'cancel';

interface MultiOptionDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  option1Text: string;
  option1Variant: 'primary' | 'danger';
  option2Text: string;
  cancelText: string;
  resolve: (result: MultiOptionResult) => void;
}

export function useMultiOptionDialog() {
  const [state, setState] = useState<MultiOptionDialogState>({
    isOpen: false,
    title: '',
    message: '',
    option1Text: 'Confirm',
    option1Variant: 'primary',
    option2Text: 'Secondary',
    cancelText: 'Cancel',
    resolve: () => {},
  });

  const show = useCallback((
    message: string,
    title: string,
    options: {
      option1Text: string;
      option1Variant?: 'primary' | 'danger';
      option2Text: string;
      cancelText?: string;
    }
  ): Promise<MultiOptionResult> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title,
        message,
        option1Text: options.option1Text,
        option1Variant: options.option1Variant || 'primary',
        option2Text: options.option2Text,
        cancelText: options.cancelText || 'Cancel',
        resolve,
      });
    });
  }, []);

  const close = useCallback(() => {
    setState(prev => {
      prev.resolve('cancel');
      return { ...prev, isOpen: false };
    });
  }, []);

  return { show, state, close };
}

export function MultiOptionDialog({ state }: { state: MultiOptionDialogState }) {
  if (!state.isOpen) return null;

  const resolve = state.resolve;

  const option1Classes = state.option1Variant === 'danger'
    ? 'bg-red-600 hover:bg-red-500 text-white'
    : 'bg-purple-700 hover:bg-purple-600 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl p-6 w-[28rem] max-w-[90vw] animate-[slideIn_0.2s_ease-out]">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">{state.title}</h3>
        <p className="text-sm text-gray-700 dark:text-gray-400 mb-6 whitespace-pre-line">{state.message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => { resolve('cancel'); state.resolve = () => {}; }}
            className="px-4 py-2 rounded-md text-sm text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {state.cancelText}
          </button>
          <button
            onClick={() => { resolve('option2'); state.resolve = () => {}; }}
            className="px-4 py-2 rounded-md text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white transition-colors"
          >
            {state.option2Text}
          </button>
          <button
            onClick={() => { resolve('option1'); state.resolve = () => {}; }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${option1Classes}`}
          >
            {state.option1Text}
          </button>
        </div>
      </div>
    </div>
  );
}
