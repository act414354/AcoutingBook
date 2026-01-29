import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { simpleDriveService } from '../../services/simpleDrive';
import type { Transaction } from '../../services/simpleDrive';

interface TransactionFormProps {
    initialData?: Transaction | null;
    onSuccess: () => void;
    onCancel?: () => void;
    embedded?: boolean;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ initialData, onSuccess, onCancel, embedded = false }) => {
    const { t, i18n } = useTranslation();
    const [type, setType] = useState<'expense' | 'income' | 'transfer' | 'exchange'>('expense');

    // Core Fields
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('TWD'); // Source Currency
    const [category, setCategory] = useState('');
    const [note, setNote] = useState('');
    const [accountId, setAccountId] = useState('');

    // Transfer/Exchange Fields
    const [toAccountId, setToAccountId] = useState('');
    const [targetCurrency, setTargetCurrency] = useState('TWD'); // Target Currency
    const [exchangeRate, setExchangeRate] = useState<string>('1.0');
    const [targetAmount, setTargetAmount] = useState<string>('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Data
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [availableAccounts, setAvailableAccounts] = useState<{ id: string, name: string, type: string }[]>([]);

    // Currency List (No BTC/ETH)
    const MAX_CURRENCIES = ['TWD', 'USD', 'JPY', 'KRW', 'EUR', 'USDT', 'USDC'];

    useEffect(() => {
        // Init currency based on Language
        if (i18n.language.includes('en')) setCurrency('USD');
        else if (i18n.language.includes('ja')) setCurrency('JPY');
        else if (i18n.language.includes('ko')) setCurrency('KRW');
        else setCurrency('TWD');
    }, [i18n.language]);

    useEffect(() => {
        const loadData = async () => {
            const settings = await simpleDriveService.getSettings();

            // Categories
            const currentType = (type === 'transfer' || type === 'exchange') ? 'expense' : type;
            setAvailableCategories(settings.categories[currentType] || []);
            if (!category && settings.categories[currentType]?.length > 0) {
                setCategory(settings.categories[currentType][0]);
            }

            // Accounts
            if (settings.accounts) {
                setAvailableAccounts(settings.accounts);
                if (!accountId && settings.accounts.length > 0) {
                    setAccountId(settings.accounts[0].id);
                }
            }
        };
        loadData();
    }, [type, initialData]);

    // Handle Exchange Rate Calculation
    useEffect(() => {
        if (!amount || !exchangeRate) return;
        const result = (parseFloat(amount) * parseFloat(exchangeRate));
        setTargetAmount(result.toFixed(2));
    }, [amount, exchangeRate]);

    const handleSubmit = async () => {
        if (!amount) return;
        if ((type === 'expense' || type === 'income') && !category) return;
        if ((type === 'transfer' || type === 'exchange') && !toAccountId) return;

        setIsSubmitting(true);
        try {
            const finalCategory = (type === 'transfer' || type === 'exchange') ? 'Transfer' : category;

            await simpleDriveService.appendTransaction(
                type as any,
                parseFloat(amount),
                finalCategory,
                note,
                accountId,
                {
                    toAccountId: (type === 'transfer' || type === 'exchange') ? toAccountId : undefined,
                    exchangeRate: (type === 'transfer' || type === 'exchange') ? parseFloat(exchangeRate) : undefined,
                    targetAmount: (type === 'transfer' || type === 'exchange') ? parseFloat(targetAmount) : undefined,
                    date: Date.now()
                }
            );

            setIsSubmitting(false);
            setShowSuccess(true);
            onSuccess();
            setTimeout(() => {
                setAmount('');
                setNote('');
                setShowSuccess(false);
            }, 1200);

        } catch (error) {
            console.error(error);
            setIsSubmitting(false);
            alert('Failed to record transaction');
        }
    };

    if (showSuccess) return (
        <div className="flex flex-col items-center justify-center p-6 bg-gray-900 rounded-xl">
            <div className="text-green-500 font-bold text-xl">Success!</div>
        </div>
    );

    return (
        <div className="w-full text-white">
            {/* Type Switcher */}
            <div className="grid grid-cols-4 gap-1 bg-gray-800 p-1 rounded-xl mb-6">
                {(['expense', 'income', 'transfer', 'exchange'] as const).map(tKey => (
                    <button
                        key={tKey}
                        onClick={() => setType(tKey)}
                        className={`py-2 text-xs font-bold rounded-lg transition-all capitalize ${type === tKey
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        {t(`transaction.${tKey}`, tKey)}
                    </button>
                ))}
            </div>

            {/* Amount & Currency */}
            <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                    <label className="block text-xs font-medium text-gray-500 mb-1">AMOUNT</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-xl py-3 px-4 text-2xl font-bold outline-none"
                        placeholder="0.00"
                    />
                </div>
                <div className="w-24">
                    <label className="block text-xs font-medium text-gray-500 mb-1">CURR</label>
                    <select
                        value={currency}
                        onChange={e => {
                            setCurrency(e.target.value);
                            // Auto-set target currency match if not exchange
                            if (type !== 'exchange') setTargetCurrency(e.target.value);
                        }}
                        className="w-full h-[54px] bg-gray-800 rounded-xl px-2 font-bold outline-none"
                    >
                        {MAX_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* Source Account */}
            <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">ACCOUNT</label>
                <select
                    value={accountId}
                    onChange={e => setAccountId(e.target.value)}
                    className="w-full bg-gray-800 rounded-xl p-3 outline-none"
                >
                    {availableAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                </select>
            </div>

            {/* Conditional Fields */}
            {(type === 'transfer' || type === 'exchange') ? (
                <div className="bg-gray-800/50 p-4 rounded-xl mb-4 border border-gray-700">
                    <label className="block text-xs font-bold text-blue-400 mb-2">TARGET ({type.toUpperCase()})</label>

                    <div className="mb-3">
                        <label className="block text-xs text-gray-500 mb-1">TO ACCOUNT</label>
                        <select
                            value={toAccountId}
                            onChange={e => setToAccountId(e.target.value)}
                            className="w-full bg-gray-800 rounded-xl p-3 outline-none"
                        >
                            <option value="">Select Account</option>
                            {availableAccounts.filter(a => a.id !== accountId).map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">TARGET CURR</label>
                            <select
                                value={targetCurrency}
                                onChange={e => setTargetCurrency(e.target.value)}
                                className="w-full bg-gray-800 rounded-xl p-3 outline-none font-bold"
                            >
                                {MAX_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">RATE</label>
                            <input
                                type="number"
                                value={exchangeRate}
                                onChange={e => setExchangeRate(e.target.value)}
                                className="w-full bg-gray-800 rounded-xl p-3 outline-none font-bold"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 mb-1">FINAL AMOUNT</label>
                        <input
                            type="number"
                            value={targetAmount}
                            onChange={e => setTargetAmount(e.target.value)}
                            className="w-full bg-gray-900 rounded-xl p-3 outline-none font-bold border border-gray-600"
                        />
                    </div>
                </div>
            ) : (
                <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">CATEGORY</label>
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full bg-gray-800 rounded-xl p-3 outline-none"
                    >
                        {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            )}

            <div className="mb-6">
                <label className="block text-xs font-medium text-gray-500 mb-1">NOTE</label>
                <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="w-full bg-gray-800 rounded-xl p-3 outline-none"
                    placeholder="Optional note..."
                />
            </div>

            <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/20"
            >
                {isSubmitting ? t('transaction.saving', 'Saving...') : t('transaction.save_btn', 'Save Transaction')}
            </button>
            {onCancel && <button onClick={onCancel} className="w-full py-3 text-gray-500 mt-2">Cancel</button>}
        </div>
    );
};
