import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { simpleDriveService } from '../../services/simpleDrive';
import { blockchainTransactionService } from '../../services/blockchainTransactionService';
import { checkDriveFiles } from '../../services/driveFileChecker';
import type { Transaction } from '../../services/simpleDrive';

interface TransactionFormProps {
    initialData?: Transaction | null;
    onSuccess: () => void;
    onCancel?: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ initialData, onSuccess, onCancel }) => {
    const { t, i18n } = useTranslation();
    const [type, setType] = useState<'expense' | 'income' | 'transfer' | 'exchange'>('expense');

    // Core Fields
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('TWD'); // Source Currency
    const [category, setCategory] = useState('');
    const [note, setNote] = useState('');
    const [accountId, setAccountId] = useState('');
    const [transactionDate, setTransactionDate] = useState(''); // 新增交易日期
    
    // Smart Input
    const [smartInput, setSmartInput] = useState(''); // 智慧輸入框

    // 智慧解析函數
    const parseSmartInput = (input: string) => {
        if (!input.trim()) return;

        // 定義分類關鍵字映射
        const categoryKeywords: { [key: string]: string } = {
            // 餐飲
            '晚餐': '餐飲', '午餐': '餐飲', '早餐': '餐飲', '消夜': '餐飲', '飯': '餐飲', '麵': '餐飲', '便當': '餐飲',
            '咖啡': '餐飲', '奶茶': '餐飲', '飲料': '餐飲', '酒': '餐飲', '聚餐': '餐飲',
            // 交通
            '捷運': '交通', '公車': '交通', '計程車': '交通', '油錢': '交通', '停車': '交通', '車資': '交通',
            '火車': '交通', '高鐵': '交通', '機票': '交通',
            // 購物
            '衣服': '購物', '鞋子': '購物', '包包': '購物', '化妝品': '購物', '日用品': '購物',
            '超市': '購物', '便利商店': '購物', '百貨': '購物', '網購': '購物',
            // 娛樂
            '電影': '娛樂', '遊戲': '娛樂', 'KTV': '娛樂', '演唱會': '娛樂', '運動': '娛樂',
            '書': '娛樂', '音樂': '娛樂',
            // 住房
            '房租': '住房', '水電費': '住房', '瓦斯': '住房', '網路': '住房', '管理費': '住房',
            // 醫療
            '看醫生': '醫療', '藥': '醫療', '醫院': '醫療', '保險': '醫療',
            // 教育
            '學費': '教育', '書籍': '教育', '課程': '教育', '補習': '教育',
            // 薪資
            '薪水': '薪資', '工資': '薪資', '獎金': '薪資', '兼職': '薪資',
            // 其他
            '紅包': '其他收入', '禮金': '其他收入', '投資': '投資收益'
        };

        // 提取金額 - 支持多種格式
        const amountPatterns = [
            /(\d+(?:\.\d+)?)\s*元/,
            /(\d+(?:\.\d+)?)\s*塊/,
            /(\d+(?:\.\d+)?)\s*$/m,
            /\$\s*(\d+(?:\.\d+)?)/
        ];

        let extractedAmount = '';
        for (const pattern of amountPatterns) {
            const match = input.match(pattern);
            if (match) {
                extractedAmount = match[1];
                break;
            }
        }

        // 提取分類
        let extractedCategory = '';
        for (const [keyword, category] of Object.entries(categoryKeywords)) {
            if (input.includes(keyword)) {
                extractedCategory = category;
                break;
            }
        }

        // 提取帳戶類型
        let extractedAccountType = '';
        if (input.includes('現金') || input.includes('cash')) {
            extractedAccountType = 'cash';
        } else if (input.includes('銀行') || input.includes('卡')) {
            extractedAccountType = 'bank';
        } else if (input.includes('信用卡') || input.includes('credit')) {
            extractedAccountType = 'credit';
        } else if (input.includes('電子錢包') || input.includes('行動支付')) {
            extractedAccountType = 'ewallet';
        }

        // 判斷交易類型
        let extractedType: 'expense' | 'income' | 'transfer' | 'exchange' = 'expense';
        if (extractedCategory === '薪資' || extractedCategory === '其他收入' || extractedCategory === '投資收益') {
            extractedType = 'income';
        } else if (input.includes('轉帳') || input.includes('轉給')) {
            extractedType = 'transfer';
        } else if (input.includes('兌換') || input.includes('換匯')) {
            extractedType = 'exchange';
        }

        // 自動填入表單
        if (extractedAmount) {
            setAmount(extractedAmount);
        }
        if (extractedCategory && availableCategories.includes(extractedCategory)) {
            setCategory(extractedCategory);
        }
        if (extractedType) {
            setType(extractedType);
        }
        if (extractedAccountType) {
            const matchingAccount = availableAccounts.find(acc => acc.type === extractedAccountType);
            if (matchingAccount) {
                setAccountId(matchingAccount.id);
            }
        }

        // 如果沒有找到分類，使用輸入文字作為備註
        if (!extractedCategory && !extractedAmount) {
            setNote(input);
        } else if (input.replace(/\d+/g, '').trim()) {
            // 提取非數字部分作為備註
            const noteText = input.replace(/\d+(?:\.\d+)?\s*(元|塊)?/g, '').trim();
            if (noteText && !categoryKeywords[noteText]) {
                setNote(noteText);
            }
        }
    };

    // Transfer/Exchange Fields
    const [toAccountId, setToAccountId] = useState('');
    const [targetCurrency, setTargetCurrency] = useState('TWD'); // Target Currency
    const [exchangeRate, setExchangeRate] = useState<string>('1.0');
    const [targetAmount, setTargetAmount] = useState<string>('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

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
        
        // 初始化交易日期為今天
        const today = new Date().toISOString().split('T')[0];
        setTransactionDate(today);
    }, [i18n.language]);

    useEffect(() => {
        const loadData = async () => {
            const settings = await simpleDriveService.getSettings();

            // Categories
            const currentType = (type === 'transfer' || type === 'exchange') ? 'expense' : type;
            const categories = settings.categories[currentType] || [];
            setAvailableCategories(categories.map(cat => cat.name));
            if (!category && categories.length > 0) {
                setCategory(categories[0].name);
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
        // 改進的驗證邏輯
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setErrorMessage(t('transaction.invalid_amount'));
            setShowError(true);
            setTimeout(() => setShowError(false), 3000);
            return;
        }
        
        if ((type === 'expense' || type === 'income') && !category) {
            setErrorMessage(t('transaction.no_category'));
            setShowError(true);
            setTimeout(() => setShowError(false), 3000);
            return;
        }

        if (!accountId) {
            setErrorMessage(t('transaction.no_account'));
            setShowError(true);
            setTimeout(() => setShowError(false), 3000);
            return;
        }

        if ((type === 'transfer' || type === 'exchange') && !toAccountId) {
            setErrorMessage(t('transaction.no_target_account'));
            setShowError(true);
            setTimeout(() => setShowError(false), 3000);
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');

        try {
            // 將選擇的日期轉換為時間戳
            const transactionTimestamp = transactionDate ? new Date(transactionDate).getTime() : Date.now();

            // 使用新的區塊鏈格式保存交易
            await blockchainTransactionService.saveTransaction(
                type,
                numAmount,
                category,
                note,
                accountId,
                {
                    currency,
                    toAccountId: (type === 'transfer' || type === 'exchange') ? toAccountId : undefined,
                    targetCurrency: (type === 'transfer' || type === 'exchange') ? targetCurrency : undefined,
                    exchangeRate: (type === 'transfer' || type === 'exchange') ? parseFloat(exchangeRate) : undefined,
                    targetAmount: (type === 'transfer' || type === 'exchange') ? parseFloat(targetAmount) : undefined,
                    date: transactionTimestamp
                }
            );

            // 重置表單
            setType('expense');
            setAmount('');
            setCategory('');
            setNote('');
            setAccountId('');
            setToAccountId('');
            setTargetCurrency(currency);
            setExchangeRate('1');
            setTargetAmount('');
            setTransactionDate(new Date().toISOString().split('T')[0]); // 重置為今天
            setSmartInput(''); // 重置智慧輸入框
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                onSuccess();
            }, 2000);

        } catch (error: any) {
            console.error('Transaction submission error:', error);
            let errorMsg = t('transaction.save_failed');
            
            if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMsg = t('transaction.network_error');
            } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
                errorMsg = t('transaction.permission_error');
            } else if (error.message.includes('quota') || error.message.includes('storage')) {
                errorMsg = t('transaction.storage_error');
            } else {
                errorMsg = `${t('transaction.save_failed')}: ${error.message}`;
            }
            
            setErrorMessage(errorMsg);
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (showSuccess) return (
        <div className="flex flex-col items-center justify-center p-6 bg-gray-900 rounded-xl">
            <div className="text-green-500 font-bold text-xl">{t('common.success')}</div>
        </div>
    );

    if (showError) return (
        <div className="flex flex-col items-center justify-center p-6 bg-red-900/20 border border-red-500/30 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-red-400 font-bold text-lg">{t('common.error')}</div>
            </div>
            <div className="text-red-300 text-sm text-center max-w-xs">{errorMessage}</div>
        </div>
    );

    return (
        <div className="w-full text-white">
            {/* Type Switcher */}
            <div className="grid grid-cols-4 gap-1 bg-gray-800 p-1 rounded-xl mb-4">
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

            {/* Smart Input */}
            <div className="mb-4">
                <label className="block text-xs font-medium text-gray-400 mb-1">
                    🧠 智慧輸入 (例如: 晚餐100)
                </label>
                <input
                    type="text"
                    value={smartInput}
                    onChange={e => setSmartInput(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            parseSmartInput(smartInput);
                            setSmartInput('');
                        }
                    }}
                    placeholder="晚餐100 / 捷運50元 / 薪水30000"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg py-2 px-3 outline-none text-white placeholder-gray-500"
                />
            </div>

            {/* Main Input Row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                {/* Transaction Date */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">📅 日期</label>
                    <input
                        type="date"
                        value={transactionDate}
                        onChange={e => setTransactionDate(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg py-2 px-2 outline-none text-white text-sm"
                    />
                </div>

                {/* Currency */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">💱 幣別</label>
                    <select
                        value={currency}
                        onChange={e => {
                            setCurrency(e.target.value);
                            if (type !== 'exchange') setTargetCurrency(e.target.value);
                        }}
                        className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg py-2 px-2 outline-none text-white text-sm"
                    >
                        {MAX_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {/* Amount */}
                <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-medium text-gray-400 mb-1">💵 金額</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg py-2 px-3 outline-none text-white text-lg font-bold placeholder-gray-500"
                        placeholder="0.00"
                        style={{
                            MozAppearance: 'textfield',
                            appearance: 'textfield',
                            WebkitAppearance: 'textfield'
                        } as React.CSSProperties}
                    />
                </div>
            </div>

            {/* Account & Category Row */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Source Account */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">🏦 帳戶</label>
                    <select
                        value={accountId}
                        onChange={e => setAccountId(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg py-2 px-3 outline-none text-white text-sm"
                    >
                        {availableAccounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                </div>

                {/* Category */}
                {type !== 'transfer' && type !== 'exchange' && (
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">📂 分類</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg py-2 px-3 outline-none text-white text-sm"
                        >
                            <option value="">選擇分類</option>
                            {availableCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Transfer/Exchange Fields */}
            {(type === 'transfer' || type === 'exchange') && (
                <div className="bg-gray-800/50 p-3 rounded-lg mb-4 border border-gray-700">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">🔄 目標帳戶</label>
                            <select
                                value={toAccountId}
                                onChange={e => setToAccountId(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg py-2 px-3 outline-none text-white text-sm"
                            >
                                <option value="">選擇帳戶</option>
                                {availableAccounts.filter(a => a.id !== accountId).map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">💱 目標幣別</label>
                            <select
                                value={targetCurrency}
                                onChange={e => setTargetCurrency(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg py-2 px-3 outline-none text-white text-sm"
                            >
                                {MAX_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">📊 匯率</label>
                            <input
                                type="number"
                                value={exchangeRate}
                                onChange={e => setExchangeRate(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg py-2 px-3 outline-none text-white text-sm"
                                step="0.01"
                                min="0"
                                style={{
                                    MozAppearance: 'textfield',
                                    appearance: 'textfield',
                                    WebkitAppearance: 'textfield'
                                } as React.CSSProperties}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">💰 目標金額</label>
                            <input
                                type="number"
                                value={targetAmount}
                                onChange={e => setTargetAmount(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg py-2 px-3 outline-none text-white text-sm"
                                step="0.01"
                                min="0"
                                style={{
                                    MozAppearance: 'textfield',
                                    appearance: 'textfield',
                                    WebkitAppearance: 'textfield'
                                } as React.CSSProperties}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Note */}
            <div className="mb-4">
                <label className="block text-xs font-medium text-gray-400 mb-1">📝 備註</label>
                <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg py-2 px-3 outline-none text-white placeholder-gray-500 resize-none text-sm"
                    rows={2}
                    placeholder="輸入備註..."
                />
            </div>

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition-colors"
            >
                {isSubmitting ? '提交中...' : '提交交易'}
            </button>

            {/* Debug Button - 檢查 Google Drive 檔案 */}
            <button
                onClick={async () => {
                    console.log('🔍 開始檢查 Google Drive 檔案...');
                    try {
                        await checkDriveFiles();
                    } catch (error) {
                        console.error('檢查失敗:', error);
                    }
                }}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded-lg transition-colors text-sm mt-2"
            >
                🔍 檢查 Google Drive 檔案
            </button>
        </div>
    );
};
