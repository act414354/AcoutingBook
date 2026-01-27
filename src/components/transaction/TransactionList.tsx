import React, { useEffect, useState } from 'react';
import { simpleDriveService } from '../../services/simpleDrive';
import type { Transaction } from '../../services/simpleDrive';

interface TransactionListProps {
    onEdit: (transaction: Transaction) => void;
    lastRefresh?: number; // Trigger to reload
}

export const TransactionList: React.FC<TransactionListProps> = ({ onEdit, lastRefresh }) => {
    // const { t } = useTranslation();
    const [history, setHistory] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadHistory();
    }, [lastRefresh]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const data = await simpleDriveService.getHistory(30);
            setHistory(data);
        } catch (error) {
            console.error("Failed to load history", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && history.length === 0) {
        return <div className="text-center text-gray-500 py-4">Loading...</div>;
    }

    if (history.length === 0) {
        return (
            <div className="text-center text-gray-500 py-8 text-sm">
                No transactions yet.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-gray-400 font-semibold text-sm uppercase tracking-wider px-2">Recent Activity</h3>
            <div className="space-y-3">
                {history.map((tx) => (
                    <div key={tx.id} className="bg-gray-800/50 rounded-xl p-4 flex justify-between items-center border border-gray-700/50">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                {tx.type === 'income' ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <div className="text-white font-bold">{tx.payload.category}</div>
                                <div className="text-gray-500 text-xs">
                                    {new Date(tx.timestamp).toLocaleDateString()}
                                    {tx.payload.note && ` • ${tx.payload.note}`}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <div className={`font-bold ${tx.type === 'income' ? 'text-green-400' : 'text-white'
                                }`}>
                                {tx.type === 'income' ? '+' : '-'}${Math.abs(tx.payload.amount).toLocaleString()}
                            </div>
                            <button
                                onClick={() => onEdit(tx)}
                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                Edit
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
