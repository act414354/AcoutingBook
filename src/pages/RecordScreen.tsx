import React, { useState } from 'react';
import { TransactionList } from '../components/transaction/TransactionList';
import type { Transaction } from '../services/simpleDrive';

interface RecordScreenProps {
    onEdit: (tx: Transaction) => void;
    lastRefresh: number;
    onSuccess?: () => void; // 添加可選的 onSuccess 參數
    showTransactionModal?: boolean; // 添加全局模態框狀態
    onOpenTransactionModal?: () => void; // 添加開啟模態框的回調
    onCloseTransactionModal?: () => void; // 添加關閉模態框的回調
}

export const RecordScreen: React.FC<RecordScreenProps> = ({ onEdit, lastRefresh, onSuccess, showTransactionModal, onOpenTransactionModal, onCloseTransactionModal }) => {
    const [isEditMode, setIsEditMode] = useState(false);

    return (
        <div className="space-y-6 h-full flex flex-col relative">
            {/* Full Height History List */}
            <div className="bg-gray-900/30 rounded-2xl border border-gray-800/50 p-2 flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto">
                    <TransactionList
                        onEdit={onEdit}
                        lastRefresh={lastRefresh}
                        editMode={isEditMode}
                    />
                </div>
            </div>

            {/* Floating Action Button (FAB) Container */}
            <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] left-0 right-0 flex justify-center pointer-events-none z-30">
                <div className="w-full max-w-[480px] relative px-4">
                    {/* Edit Mode Button - Left of Add Button */}
                    <button
                        onClick={() => setIsEditMode(v => !v)}
                        className="absolute right-[5.5rem] bottom-0 w-10 h-10 bg-gray-800/90 border border-gray-700 rounded-full shadow-lg flex items-center justify-center text-gray-200 hover:text-white hover:bg-gray-700 transition-transform active:scale-95 pointer-events-auto"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    
                    {/* Add Transaction Button - Right */}
                    <button
                        onClick={() => onOpenTransactionModal && onOpenTransactionModal()}
                        className="absolute right-4 bottom-0 w-14 h-14 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full shadow-lg shadow-blue-500/40 flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 pointer-events-auto"
                    >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
