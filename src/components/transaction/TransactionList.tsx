import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { simpleDriveService } from '../../services/simpleDrive';
import { dailyTransactionService } from '../../services/dailyTransactionService';
import { checkDriveFiles } from '../../services/driveFileChecker';
import type { Transaction } from '../../services/simpleDrive';
import type { UserSettings } from '../../services/userSettingsService';
import type { DailyTransaction } from '../../services/dailyTransactionService';

interface TransactionListProps {
    onEdit: (transaction: Transaction) => void;
    lastRefresh?: number; // Trigger to reload
    editMode?: boolean;
}

const TAG_STORAGE_KEY = 'qb_tx_tag_colors_v1';

const TAG_COLORS: { id: string; bgClass: string; dotClass: string }[] = [
    { id: 'none', bgClass: 'bg-gray-800/50 border-gray-700/50', dotClass: 'bg-gray-500' },
    { id: 'yellow', bgClass: 'bg-yellow-500/10 border-yellow-500/30', dotClass: 'bg-yellow-400' },
    { id: 'red', bgClass: 'bg-red-500/10 border-red-500/30', dotClass: 'bg-red-400' },
    { id: 'green', bgClass: 'bg-green-500/10 border-green-500/30', dotClass: 'bg-green-400' },
    { id: 'purple', bgClass: 'bg-purple-500/10 border-purple-500/30', dotClass: 'bg-purple-400' },
];

export const TransactionList: React.FC<TransactionListProps> = ({ onEdit, lastRefresh, editMode = false }) => {
    const { t } = useTranslation();
    const [history, setHistory] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<UserSettings | null>(null);

    const [tagColors, setTagColors] = useState<Record<string, string>>({});
    const [openTagTxId, setOpenTagTxId] = useState<string | null>(null);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);

    useEffect(() => {
        loadHistory();
    }, [lastRefresh]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(TAG_STORAGE_KEY);
            if (raw) setTagColors(JSON.parse(raw));
        } catch {
            setTagColors({});
        }
    }, []);

    const loadHistory = async () => {
        setLoading(true);
        try {
            // 確保先同步快照
            await simpleDriveService.syncLatestBlock();
            
            // 使用新的每日交易服務讀取 Google Drive 上的檔案
            const [dailyData, s] = await Promise.all([
                dailyTransactionService.getHistory(30),
                simpleDriveService.getSettings()
            ]);
            
            const convertedTransactions = dailyData.map(tx => ({
                ...tx,
                snapshot: tx.snapshot
            }));
            
            setHistory(convertedTransactions);
            setSettings(s);
            console.log(`✅ 從 Google Drive 讀取了 ${convertedTransactions.length} 筆交易`);
        } catch (error) {
            console.error("❌ 新系統讀取失敗:", error);
            // 如果新系統失敗，回退到舊系統
            try {
                const [data, s] = await Promise.all([
                    simpleDriveService.getHistory(30),
                    simpleDriveService.getSettings()
                ]);
                setHistory(data);
                setSettings(s);
                console.log("⚠️ 使用舊系統數據");
            } catch (fallbackError) {
                console.error("❌ 舊系統也失敗:", fallbackError);
                setHistory([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const accountsById = useMemo(() => {
        const map: Record<string, { id: string; name: string; type: string; currency: string }> = {};
        for (const acc of settings?.accounts ?? []) {
            map[acc.id] = { id: acc.id, name: acc.name, type: acc.type, currency: acc.currency || 'TWD' };
        }
        return map;
    }, [settings]);

    const getDayKey = (ts: number) => new Date(ts).toLocaleDateString();

    const dailyExpenseByDayKey = useMemo(() => {
        const sums: Record<string, number> = {};
        for (const tx of history) {
            if (tx.type !== 'expense') continue;
            const k = getDayKey(tx.timestamp);
            sums[k] = (sums[k] || 0) + Math.abs(tx.payload.amount);
        }
        return sums;
    }, [history]);

    const persistTagColors = (next: Record<string, string>) => {
        setTagColors(next);
        try {
            localStorage.setItem(TAG_STORAGE_KEY, JSON.stringify(next));
        } catch {
        }
    };

    const setTagForTx = (txId: string, tagId: string) => {
        const next = { ...tagColors };
        if (tagId === 'none') delete next[txId];
        else next[txId] = tagId;
        persistTagColors(next);
        setOpenTagTxId(null);
    };

    if (loading && history.length === 0) {
        return <div className="text-center text-gray-500 py-4">{t('common.loading')}</div>;
    }

    if (history.length === 0) {
        return (
            <div className="text-center text-gray-500 py-8 text-sm">
                {t('transaction.no_transactions')}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {history.map((tx, idx) => {
                const prev = history[idx - 1];
                const currentBalance = tx.snapshot?.accounts?.[tx.payload.accountId]?.[tx.payload.currency || 'TWD'] ?? 0;
                const showDaySeparator = idx === 0 || getDayKey(tx.timestamp) !== getDayKey(prev.timestamp);
                const dayKey = getDayKey(tx.timestamp);
                const dayExpense = dailyExpenseByDayKey[dayKey] || 0;
                const noteLabel = tx.payload.note?.trim();
                const fromAcc = accountsById[tx.payload.accountId];
                const accountLabel = fromAcc ? fromAcc.name : tx.payload.accountId; // 顯示帳戶名稱，如 "cash"

                const tagId = tagColors[tx.id] || 'none';
                const tagColor = TAG_COLORS.find(c => c.id === tagId);

                const showTagPicker = editMode && openTagTxId === tx.id;

                return (
                    <React.Fragment key={tx.id}>
                        {showDaySeparator && (
                            <div className="px-2 pt-3 pb-1 flex items-center justify-between">
                                <div className="text-gray-500 text-xs font-semibold">{dayKey}</div>
                                <div className="text-gray-500 text-xs font-semibold">-{dayExpense.toLocaleString()}</div>
                            </div>
                        )}

                        <div
                            className={`bg-gray-800/50 border-gray-700/50 rounded-xl px-3 py-2 flex justify-between items-center border transition-colors ${tagColor?.bgClass}`}
                            onTouchStart={(e) => {
                                if (!editMode) return;
                                setTouchStartX(e.touches[0]?.clientX ?? null);
                            }}
                            onTouchMove={(e) => {
                                if (!editMode) return;
                                if (touchStartX === null) return;
                                const x = e.touches[0]?.clientX;
                                if (x === undefined) return;
                                const dx = x - touchStartX;
                                if (dx > 70) setOpenTagTxId(tx.id);
                            }}
                            onTouchEnd={() => {
                                setTouchStartX(null);
                            }}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    tx.type === 'income' ? 'bg-green-500/20 text-green-400' : 
                                    tx.type === 'transfer' ? 'bg-blue-500/20 text-blue-400' : 
                                    'bg-red-500/20 text-red-400'
                                }`}>
                                    {tx.type === 'income' ? (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                        </svg>
                                    ) : tx.type === 'transfer' ? (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                                        </svg>
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <div className="text-white font-semibold text-sm truncate">
                                        {tx.type === 'transfer' 
                                            ? `${accountsById[tx.payload.accountId]?.name || tx.payload.accountId} → ${accountsById[tx.payload.toAccountId]?.name || tx.payload.toAccountId}${noteLabel ? ` • ${noteLabel}` : ''}`
                                            : `${tx.payload.category}${noteLabel ? ` • ${noteLabel}` : ''}`
                                        }
                                    </div>
                                    <div className="text-gray-400 text-xs truncate">
                                        {tx.type === 'transfer' ? '轉帳' : accountLabel}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-0.5">
                                <div className={`font-bold text-sm ${
                                    tx.type === 'income' ? 'text-green-400' : 
                                    tx.type === 'transfer' ? 'text-blue-400' : 
                                    'text-white'
                                }`}>
                                    {tx.type === 'transfer' 
                                        ? `$${(tx.payload.targetAmount || tx.payload.amount).toLocaleString()}`
                                        : `${tx.type === 'income' ? '+' : '-'}$${Math.abs(tx.payload.amount).toLocaleString()}`
                                    }
                                </div>
                                {tx.type === 'transfer' ? (
                                    <div className="text-[11px] text-gray-500">
                                        {`${accountsById[tx.payload.accountId]?.name || tx.payload.accountId}:${tx.snapshot?.accounts?.[tx.payload.accountId]?.[tx.payload.currency || 'TWD']?.toLocaleString() || '0'}`}
                                        <br />
                                        {`${accountsById[tx.payload.toAccountId]?.name || tx.payload.toAccountId}:${tx.snapshot?.accounts?.[tx.payload.toAccountId]?.[tx.payload.currency || 'TWD']?.toLocaleString() || '0'}`}
                                    </div>
                                ) : (
                                    <div className="text-[11px] text-gray-500">
                                        {Number.isFinite(currentBalance) ? `${fromAcc?.name || tx.payload.accountId}:${currentBalance.toLocaleString()}` : ''}
                                    </div>
                                )}
                                {editMode && (
                                    <button
                                        onClick={() => onEdit(tx)}
                                        className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        {t('common.edit', 'Edit')}
                                    </button>
                                )}
                            </div>
                        </div>

                        {showTagPicker && (
                            <div className="flex gap-2 px-3 py-2 bg-gray-900/90 rounded-lg border border-gray-700">
                                {TAG_COLORS.map((c) => (
                                    <button
                                        key={c.id}
                                        onClick={() => setTagForTx(tx.id, c.id)}
                                        className={`w-7 h-7 rounded-full border border-gray-700 flex items-center justify-center ${c.id === tagId ? 'ring-2 ring-blue-500/60' : ''}`}
                                    >
                                        <div className={`w-3.5 h-3.5 rounded-full ${c.dotClass}`}></div>
                                    </button>
                                ))}
                                <button
                                    onClick={() => setOpenTagTxId(null)}
                                    className="ml-auto text-xs text-gray-400 hover:text-gray-200"
                                >
                                    {t('common.close', 'Close')}
                                </button>
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};
