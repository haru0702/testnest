import { useEffect } from 'react';

type ConfirmDialogProps = {
  projectName: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  projectName,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h3
          id="delete-dialog-title"
          className="text-xl font-semibold text-slate-950"
        >
          Delete project?
        </h3>
        <p
          id="delete-dialog-description"
          className="mt-3 text-sm leading-6 text-slate-600"
        >
          Delete "{projectName}"? This action cannot be undone.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            autoFocus
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-800"
            onClick={onConfirm}
          >
            Delete Project
          </button>
        </div>
      </section>
    </div>
  );
}
