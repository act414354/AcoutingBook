import React from 'react';
import { useTranslation } from 'react-i18next';
import { TransactionForm } from './TransactionForm';
import type { Transaction } from '../../services/simpleDrive';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 flex items-end justify-center sm:items-center pointer-events-none">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity pointer-events-auto"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-gray-900 rounded-t-3xl sm:rounded-2xl p-6 border-t sm:border border-gray-800 shadow-2xl transform transition-transform animate-slide-up pointer-events-auto max-h-full overflow-y-auto">
                {/* Handle Bar (Mobile) */}
                <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-6 sm:hidden"></div>

                <div className="flex justify-between items-center mb-0">
                    <h2 className="text-xl font-bold text-white">
                        {initialData ? 'Edit Transaction' : t('transaction.new')}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="mt-4">
                    <TransactionForm
                        initialData={initialData}
                        onSuccess={() => {
                            onSuccess();
                            setTimeout(onClose, 1200); // Wait for success animation
                        }}
                    />
                </div>
            </div>
        </div>
    );
};
