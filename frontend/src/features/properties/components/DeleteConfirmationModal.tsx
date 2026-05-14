import React from 'react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  propertyName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

export function DeleteConfirmationModal({ isOpen, propertyName, onConfirm, onCancel, isPending }: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mx-auto mb-4 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">delete_forever</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Property?</h2>
          <p className="text-sm text-slate-500">
            Are you sure you want to delete <span className="font-bold text-slate-700 dark:text-slate-300">"{propertyName}"</span>? This action cannot be undone and will remove it from the AI agent's knowledge base.
          </p>
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
           <button 
             onClick={onCancel}
             disabled={isPending}
             className="flex-1 px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
           >
             Cancel
           </button>
           <button 
             onClick={onConfirm}
             disabled={isPending}
             className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
           >
             {isPending && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
             {isPending ? 'Deleting...' : 'Delete'}
           </button>
        </div>
      </div>
    </div>
  );
}
