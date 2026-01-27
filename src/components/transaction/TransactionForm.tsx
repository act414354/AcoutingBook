import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { simpleDriveService } from '../../services/simpleDrive';
import type { Transaction } from '../../services/simpleDrive';

interface TransactionFormProps {
    initialData?: Transaction | null;
    onSuccess: () => void;
    onCancel?: () => void;
    embedded?: boolean; // If true, hide some modal-specific UI elements if needed, or adjust padding
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ initialData, onSuccess, onCancel, embedded = false }) => {
    const { t } = useTranslation();
    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [note, setNote] = useState('');
    const [accountId, setAccountId] = useState('acc_cash');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State for Categories and Accounts
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [availableAccounts, setAvailableAccounts] = useState<{ id: string, name: string, type: string }[]>([]);

    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            const settings = await simpleDriveService.getSettings();

            // 1. Categories
            const usageMap = await simpleDriveService.getCategoryUsage(type);
            const sortedCategories = [...settings.categories[type]].sort((a, b) => {
                const countA = usageMap.get(a) || 0;
                const countB = usageMap.get(b) || 0;
                return countB - countA;
            });
            setAvailableCategories(sortedCategories);

            if ((!category || category === '') && !initialData && sortedCategories.length > 0) {
                setCategory(sortedCategories[0]);
            }

            // 2. Accounts
            if (settings.accounts) {
                setAvailableAccounts(settings.accounts);
                // Default to first account if not set
                if (!accountId && settings.accounts.length > 0) {
                    setAccountId(settings.accounts[0].id);
                }
            }
        };
        loadData();
    }, [type, initialData]);

    useEffect(() => {
        if (initialData) {
            setType(initialData.type as 'expense' | 'income');
            setAmount(Math.abs(initialData.payload.amount).toString());
            setCategory(initialData.payload.category);
            setNote(initialData.payload.note);
            if (initialData.payload.accountId) {
                setAccountId(initialData.payload.accountId);
            }
        } else {
            // New transaction defaults
        }
    }, [initialData]);

    const handleSubmit = async () => {
        if (!amount || !category) return;

        setIsSubmitting(true);
        try {
            if (initialData) {
                await simpleDriveService.editTransaction(initialData, {
                    amount: parseFloat(amount),
                    category,
                    note,
                    accountId
                });
            } else {
                await simpleDriveService.appendTransaction(
                    type,
                    parseFloat(amount),
                    category,
                    note,
                    accountId
                );
            }

            setIsSubmitting(false);
            setShowSuccess(true);

            onSuccess();

            // Reset form after success
            setTimeout(() => {
                setAmount('');
                setNote('');
                setShowSuccess(false);
                // Keep category or reset to first? 
                // Let the effect handle category reset if needed or keep last used.
            }, 1200);

        } catch (error) {
            console.error(error);
            setIsSubmitting(false);
            alert('Failed to record transaction');
        }
    };

    if (showSuccess) {
        return (
            <div className={`flex flex-col items-center justify-center p-6 ${embedded ? 'min-h-[300px]' : ''}`}>
                <div className="bg-green-500/10 p-4 rounded-full mb-4 animate-bounce">
                    <svg className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <p className="text-white font-bold text-lg">{t('transaction.success', 'Success!')}</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Type Switcher */}
            <div className="flex bg-gray-800 p-1 rounded-xl mb-6">
                <button
                    onClick={() => setType('expense')}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${type === 'expense'
                        ? 'bg-red-500/90 text-white shadow-lg shadow-red-500/20'
                        : 'text-gray-400 hover:text-gray-200'
                        }`}
                >
                    {t('transaction.expense')}
                </button>
                <button
                    onClick={() => setType('income')}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${type === 'income'
                        ? 'bg-green-500/90 text-white shadow-lg shadow-green-500/20'
                        : 'text-gray-400 hover:text-gray-200'
                        }`}
                >
                    {t('transaction.income')}
                </button>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">{t('transaction.amount_label')}</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">$</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (/^[0-9+\-.\s]*$/.test(val)) {
                                setAmount(val);
                            }
                        }}
                        onBlur={() => {
                            try {
                                if (!amount) return;
                                if (/[+\-]/.test(amount)) {
                                    // eslint-disable-next-line
                                    const result = new Function('return ' + amount)();
                                    if (!isNaN(result) && isFinite(result)) {
                                        setAmount(Math.abs(result).toString());
                                    }
                                }
                            } catch (e) { }
                        }}
                        placeholder={t('transaction.amount_placeholder')}
                        className="w-full bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-10 pr-4 text-white text-3xl font-bold outline-none transition-all placeholder-gray-600"
                    />
                </div>
            </div>

            {/* Account & Category */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Account Selector */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">{t('transaction.account_label', 'Account')}</label>
                    <div className="relative">
                        <select
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 pr-8 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer text-sm"
                        >
                            {availableAccounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                    {t(`transaction.accounts.${acc.type}`, { defaultValue: acc.name })}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Category Selector */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">{t('transaction.category_label')}</label>
                    <div className="relative">
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 pr-8 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer text-sm"
                        >
                            <option value="" disabled>{t('transaction.category_placeholder')}</option>
                            {availableCategories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {t(`transaction.categories.${cat.toLowerCase()}`, { defaultValue: cat })}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Note */}
            <div className="mb-8">
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">{t('transaction.note_label')}</label>
                <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t('transaction.note_placeholder')}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
            </div>

            {/* Submit Action */}
            <button
                onClick={handleSubmit}
                disabled={isSubmitting || !amount || !category}
                className={`
                    w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center transition-all
                    ${isSubmitting
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30 hover:scale-[1.02] active:scale-95'
                    }
                `}
            >
                {isSubmitting ? (
                    <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    t('transaction.save_btn')
                )}
            </button>

            {onCancel && (
                <button
                    onClick={onCancel}
                    className="w-full mt-3 py-3 text-gray-400 hover:text-white transition-colors"
                >
                    {t('common.cancel', 'Cancel')}
                </button>
            )}
        </div>
    );
};
