import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TransactionList } from '../components/transaction/TransactionList';
import { TransactionModal } from '../components/transaction/TransactionModal'; // Reuse Modal
import type { Transaction } from '../services/simpleDrive';

interface RecordScreenProps {
    onSuccess: () => void;
    onEdit: (tx: Transaction) => void;
    lastRefresh: number;
}

export const RecordScreen: React.FC<RecordScreenProps> = ({ onSuccess, onEdit, lastRefresh }) => {
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSuccess = () => {
        onSuccess();
        setIsModalOpen(false); // Close modal on success
    };

    return (
        <div className="space-y-6 h-full flex flex-col relative">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <h2 className="text-xl font-bold text-white">{t('dashboard.record', 'Record')}</h2>
            </div>

            {/* Full Height History List */}
            <div className="bg-gray-900/30 rounded-2xl border border-gray-800/50 p-2 flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto">
                    <TransactionList
                        onEdit={onEdit}
                        lastRefresh={lastRefresh}
                    />
                </div>
            </div>

            {/* Floating Action Button (FAB) Container */}
            <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] left-0 right-0 flex justify-center pointer-events-none z-30">
                <div className="w-full max-w-[480px] relative px-4">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="absolute right-4 bottom-0 w-14 h-14 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full shadow-lg shadow-blue-500/40 flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 pointer-events-auto"
                    >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Add Transaction Modal */}
            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleSuccess}
            />
        </div>
    );
};
