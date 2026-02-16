import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { simpleDriveService } from '../../services/simpleDrive';
import { blockchainTransactionService } from '../../services/blockchainTransactionService';
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
    const parseTimeoutRef = useRef<number | null>(null); // 防抖定時器

    // 智慧解析函數 - 重新設計邏輯：拆分文字與數字
    const parseSmartInput = (input: string, isRealTime: boolean = true) => {
        if (!input.trim()) return;

        // 定義分類關鍵字映射 - 支援中文和拼音
        const categoryKeywords: { [key: string]: string } = {
            // 餐飲 - 中文
            '晚餐': '餐飲', '午餐': '餐飲', '早餐': '餐飲', '消夜': '餐飲', '飯': '餐飲', '麵': '餐飲', '便當': '餐飲',
            '咖啡': '餐飲', '奶茶': '餐飲', '飲料': '餐飲', '酒': '餐飲', '聚餐': '餐飲',
            // 餐飲 - 拼音
            'wancan': '餐飲', 'wucan': '餐飲', 'zaocan': '餐飲', 'xiaoye': '餐飲', 'fan': '餐飲', 'mian': '餐飲',
            'biancan': '餐飲', 'kafei': '餐飲', 'naicha': '餐飲', 'yinliao': '餐飲', 'jiucan': '餐飲',
            
            // 交通 - 中文
            '捷運': '交通', '公車': '交通', '計程車': '交通', '油錢': '交通', '停車': '交通', '車資': '交通',
            '火車': '交通', '高鐵': '交通', '機票': '交通',
            // 交通 - 拼音
            'jieyun': '交通', 'gongche': '交通', 'jichengche': '交通', 'youqian': '交通', 'tingche': '交通',
            'chezi': '交通', 'huoche': '交通', 'gaotie': '交通', 'jipiao': '交通',
            
            // 購物 - 中文
            '衣服': '購物', '鞋子': '購物', '包包': '購物', '化妝品': '購物', '日用品': '購物',
            '超市': '購物', '便利商店': '購物', '百貨': '購物', '網購': '購物',
            // 購物 - 拼音
            'yifu': '購物', 'xiezi': '購物', 'baobao': '購物', 'huazhuangpin': '購物', 'riyongpin': '購物',
            'chaoshi': '購物', 'bianlidian': '購物', 'baihuo': '購物', 'wanggou': '購物',
            
            // 娛樂 - 中文
            '電影': '娛樂', '遊戲': '娛樂', 'KTV': '娛樂', '演唱會': '娛樂', '運動': '娛樂',
            '書': '娛樂', '音樂': '娛樂',
            // 娛樂 - 拼音
            'dianying': '娛樂', 'youxi': '娛樂', 'yundong': '娛樂', 'shu': '娛樂', 'yinyue': '娛樂',
            
            // 住房 - 中文
            '房租': '住房', '水電費': '住房', '瓦斯': '住房', '網路': '住房', '管理費': '住房',
            // 住房 - 拼音
            'fangzu': '住房', 'shuidianfei': '住房', 'wasi': '住房', 'wanglu': '住房', 'guanlifei': '住房',
            
            // 醫療 - 中文
            '看醫生': '醫療', '藥': '醫療', '醫院': '醫療', '保險': '醫療',
            // 醫療 - 拼音
            'kanyisheng': '醫療', 'yao': '醫療', 'yiyuan': '醫療', 'baoxian': '醫療',
            
            // 教育 - 中文
            '學費': '教育', '書籍': '教育', '課程': '教育', '補習': '教育',
            // 教育 - 拼音
            'xuefei': '教育', 'shuji': '教育', 'kecheng': '教育', 'buxi': '教育',
            
            // 薪資 - 中文
            '薪水': '薪資', '工資': '薪資', '獎金': '薪資', '兼職': '薪資',
            // 薪資 - 拼音
            'xinzi': '薪資', 'gongzi': '薪資', 'jiangjin': '薪資', 'jianzhi': '薪資',
            
            // 其他
            '紅包': '其他收入', '禮金': '其他收入', '投資': '投資收益',
            'hongbao': '其他收入', 'lijin': '其他收入', 'touzi': '投資收益'
        };

        // 步驟1：拆分文字與數字 - 支援金額在任意位置
        const amountPatterns = [
            /(\d+(?:\.\d+)?)\s*元/,
            /(\d+(?:\.\d+)?)\s*塊/,
            /(\d+(?:\.\d+)?)\s*$/m,
            /\$\s*(\d+(?:\.\d+)?)/,
            /(\d+(?:\.\d+)?)/  // 匹配任何位置的數字
        ];

        let extractedAmount = '';
        let textPart = input;

        // 提取金額並從文字中移除
        for (const pattern of amountPatterns) {
            const match = input.match(pattern);
            if (match) {
                extractedAmount = match[1];
                // 使用更精確的替換，只移除匹配到的金額部分
                textPart = input.replace(match[0], '').trim();
                break;
            }
        }

        // 清理文字部分，移除多餘的空格
        textPart = textPart.replace(/\s+/g, ' ').trim();

        // 步驟2：設置金額
        if (extractedAmount) {
            setAmount(extractedAmount);
        }

        // 步驟3：設置備註（文字部分）
        if (textPart) {
            setNote(textPart);
        }

        // 步驟4：從備註判斷分類
        let extractedCategory = '';
        for (const [keyword, category] of Object.entries(categoryKeywords)) {
            if (textPart.includes(keyword)) {
                extractedCategory = category;
                break;
            }
        }

        // 步驟5：設置分類
        if (extractedCategory && availableCategories.includes(extractedCategory)) {
            setCategory(extractedCategory);
        }

        // 步驟6：判斷交易類型
        let extractedType: 'expense' | 'income' | 'transfer' | 'exchange' = 'expense';
        if (extractedCategory === '薪資' || extractedCategory === '其他收入' || extractedCategory === '投資收益') {
            extractedType = 'income';
        } else if (textPart.includes('轉帳') || textPart.includes('轉給') || textPart.includes('zhuanzhang') || textPart.includes('zhuan')) {
            extractedType = 'transfer';
        } else if (textPart.includes('兌換') || textPart.includes('換匯') || textPart.includes('duihuan') || textPart.includes('huanhui')) {
            extractedType = 'exchange';
        }

        // 步驟7：設置交易類型
        if (extractedType) {
            setType(extractedType);
        }

        // 步驟8：判斷帳戶類型
        let extractedAccountType = '';
        if (textPart.includes('現金') || textPart.includes('cash') || textPart.includes('xianjin')) {
            extractedAccountType = 'cash';
        } else if (textPart.includes('銀行') || textPart.includes('卡') || textPart.includes('yinhang') || textPart.includes('ka')) {
            extractedAccountType = 'bank';
        } else if (textPart.includes('信用卡') || textPart.includes('credit') || textPart.includes('xinyongka')) {
            extractedAccountType = 'credit';
        } else if (textPart.includes('電子錢包') || textPart.includes('行動支付') || textPart.includes('dianziqianbao') || textPart.includes('xingdongzhifu')) {
            extractedAccountType = 'ewallet';
        }

        // 步驟9：設置帳戶
        if (extractedAccountType && !accountId) {
            const matchingAccount = availableAccounts.find(acc => acc.type === extractedAccountType);
            if (matchingAccount) {
                setAccountId(matchingAccount.id);
            }
        }
    };

    // 清理定時器
    useEffect(() => {
        return () => {
            if (parseTimeoutRef.current) {
                clearTimeout(parseTimeoutRef.current);
            }
        };
    }, []);

    // 處理智慧輸入清空的函數
    const handleSmartInputClear = () => {
        // 重置由智慧輸入設置的欄位
        // 保留用戶手動輸入的內容，只重置智慧輸入設置的內容
        
        // 檢查金額是否由智慧輸入設置（簡單判斷：如果金額欄位有值且智慧輸入框為空）
        if (amount) {
            // 可以選擇性清空，或者保留讓用戶手動處理
            // 這裡我們清空，因為用戶清空智慧輸入通常表示要重新開始
            setAmount('');
        }
        
        // 清空備註（因為備註是由智慧輸入的文字部分設置的）
        setNote('');
        
        // 重置分類到預設值
        setCategory('');
        
        // 重置交易類型到預設值
        setType('expense');
        
        // 帳戶保持不變，因為帳戶通常是用戶選擇的
        // 如果需要也可以重置：setAccountId('');
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
            try {
                console.log('🔄 正在載入設定資料...');
                const settings = await simpleDriveService.getSettings();
                console.log('✅ 設定資料載入成功:', settings);

                // Categories
                const currentType = (type === 'transfer' || type === 'exchange') ? 'expense' : type;
                const categories = settings.categories[currentType] || [];
                setAvailableCategories(categories.map(cat => cat.name));
                if (!category && categories.length > 0) {
                    setCategory(categories[0].name);
                }

                // Accounts
                if (settings.accounts) {
                    console.log('📋 可用帳戶:', settings.accounts);
                    setAvailableAccounts(settings.accounts);
                    if (!accountId && settings.accounts.length > 0) {
                        setAccountId(settings.accounts[0].id);
                    }
                } else {
                    console.warn('⚠️ 沒有找到帳戶資料');
                }
            } catch (error) {
                console.error('❌ 載入設定資料失敗:', error);
                // 設置預設帳戶以防載入失敗
                const defaultAccounts = [
                    { id: '001_cash_cash', name: 'cash', type: 'cash' },
                    { id: '002_bank_bank', name: 'bank', type: 'bank' }
                ];
                setAvailableAccounts(defaultAccounts);
                if (!accountId) {
                    setAccountId(defaultAccounts[0].id);
                }
            }
        };
        loadData();
    }, [type, initialData]);

    // Handle Exchange Rate Calculation
    useEffect(() => {
        if (!amount) return;
        
        if (type === 'transfer') {
            // 轉帳交易：目標金額等於原始金額，匯率設為 1
            setExchangeRate('1');
            setTargetAmount(amount);
        } else if (type === 'exchange' && exchangeRate) {
            // 兌換交易：根據匯率計算目標金額
            const result = (parseFloat(amount) * parseFloat(exchangeRate));
            setTargetAmount(result.toFixed(2));
        }
    }, [amount, exchangeRate, type]);

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

        if ((type === 'transfer' || type === 'exchange') && !targetAmount) {
            setErrorMessage('請輸入目標金額');
            setShowError(true);
            setTimeout(() => setShowError(false), 3000);
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');

        const startTime = performance.now(); // 開始計時

        try {
            // 將選擇的日期轉換為時間戳
            const transactionTimestamp = transactionDate ? new Date(transactionDate).getTime() : Date.now();

            // 使用優化的區塊鏈格式保存交易
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

            const endTime = performance.now(); // 結束計時
            const duration = endTime - startTime;
            console.log(`⚡ 交易提交耗時: ${duration.toFixed(2)}ms`);

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
            const endTime = performance.now();
            const duration = endTime - startTime;
            console.error(`❌ 交易提交失敗，耗時: ${duration.toFixed(2)}ms`, error);
            
            let errorMsg = t('transaction.save_failed');
            
            // 檢查是否為認證錯誤
            const isAuthError = 
                error.status === 401 || 
                error.message === 'AUTH_EXPIRED' ||
                error.result?.error?.code === 401 ||
                error.result?.error?.message?.includes('Invalid Credentials') ||
                error.body?.error?.code === 401 ||
                error.body?.error?.message?.includes('Invalid Credentials');
            
            if (isAuthError) {
                errorMsg = '登入已過期，請重新登入';
                // 清除過期權杖
                localStorage.removeItem('quickbook_google_token');
                console.log('🔄 已清除過期權杖，請用戶重新登入');
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
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
            <div className="grid grid-cols-3 gap-2 bg-gray-800 p-2 rounded-xl mb-4">
                {(['expense', 'income', 'transfer'] as const).map(tKey => {
                    const getActiveStyles = () => {
                        switch (tKey) {
                            case 'expense':
                                return 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30';
                            case 'income':
                                return 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-500/30';
                            case 'transfer':
                                return 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30';
                            default:
                                return 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30';
                        }
                    };

                    return (
                        <button
                            key={tKey}
                            onClick={() => setType(tKey)}
                            className={`py-3 px-4 text-sm font-bold rounded-lg transition-all capitalize ${type === tKey
                                ? getActiveStyles()
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                                }`}
                        >
                            {t(`transaction.${tKey}`, tKey)}
                        </button>
                    );
                })}
            </div>

            {/* Smart Input */}
            <div className="mb-4">
                <label className="block text-xs font-medium text-gray-400 mb-1">
                    🧠 智慧輸入 (例如: 晚餐100)
                </label>
                <input
                    type="text"
                    value={smartInput}
                    onChange={e => {
                        const newValue = e.target.value;
                        setSmartInput(newValue);
                        
                        // 如果輸入框有內容，立即解析
                        if (newValue.trim()) {
                            // 清除之前的定時器
                            if (parseTimeoutRef.current) {
                                clearTimeout(parseTimeoutRef.current);
                            }
                            
                            // 立即解析
                            parseSmartInput(newValue, true);
                        } else {
                            // 輸入框為空時，清除定時器並重置智慧輸入相關欄位
                            if (parseTimeoutRef.current) {
                                clearTimeout(parseTimeoutRef.current);
                            }
                            
                            // 重置由智慧輸入設置的欄位
                            // 保留用戶手動輸入的內容，只重置智慧輸入設置的內容
                            handleSmartInputClear();
                        }
                    }}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            // 按下 Enter 時不清空智慧輸入框，讓用戶可以繼續編輯
                            // 只執行解析，不清空內容
                            if (smartInput.trim()) {
                                parseSmartInput(smartInput, true);
                            }
                        }
                    }}
                    placeholder="晚餐100 / 捷運50元 / 薪水30000"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg py-2 px-3 outline-none text-white placeholder-gray-500"
                />
            </div>

            {/* Transaction Date */}
            <div className="mb-4">
                <label className="block text-xs font-medium text-gray-400 mb-1">📅 日期</label>
                <input
                    type="date"
                    value={transactionDate}
                    onChange={e => setTransactionDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg py-2 px-3 outline-none text-white text-sm"
                />
            </div>

            {/* Visual Transaction Flow */}
            <div className="bg-gray-800/50 rounded-xl p-4 mb-4 border border-gray-700">
                {/* From Account */}
                <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                        {type === 'expense' ? '💳 支出帳戶' : type === 'income' ? '💰 收入帳戶' : '📤 轉出帳戶'}
                    </label>
                    <div className="flex gap-3">
                        <select
                            value={accountId}
                            onChange={e => {
                                console.log('🏦 選擇轉出帳戶:', e.target.value);
                                setAccountId(e.target.value);
                            }}
                            className="flex-1 bg-gray-700 border border-gray-600 focus:border-blue-500 rounded-lg py-2 px-3 outline-none text-white text-sm"
                        >
                            {availableAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-32 bg-gray-700 border border-gray-600 focus:border-blue-500 rounded-lg py-2 px-3 outline-none text-white text-sm font-bold placeholder-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:m-0"
                            placeholder="0.00"
                        />
                    </div>
                </div>

                {/* Arrow */}
                {(type === 'transfer' || type === 'exchange') && (
                    <div className="flex justify-center mb-4">
                        <div className="flex flex-col items-center gap-2">
                            {/* 箭頭主體 */}
                            <div className="relative">
                                {/* 發光效果 */}
                                <div className="absolute inset-0 w-8 h-8 bg-blue-500/20 rounded-full blur-md animate-pulse"></div>
                                
                                {/* 箭頭圓形背景 */}
                                <div className="relative w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                                    <svg 
                                        className="w-5 h-5 text-white animate-bounce" 
                                        fill="none" 
                                        viewBox="0 0 24 24" 
                                        stroke="currentColor"
                                        style={{ animationDuration: '2s' }}
                                    >
                                        <path 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                            strokeWidth={2.5} 
                                            d="M19 14l-7 7m0 0l-7-7m7 7V3" 
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* To Account */}
                {(type === 'transfer' || type === 'exchange') && (
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-400 mb-2">
                            📥 轉入帳戶
                        </label>
                        <div className="flex gap-3">
                            <select
                                value={toAccountId}
                                onChange={e => {
                                    console.log('🏦 選擇轉入帳戶:', e.target.value);
                                    setToAccountId(e.target.value);
                                }}
                                className="flex-1 bg-gray-700 border border-gray-600 focus:border-blue-500 rounded-lg py-2 px-3 outline-none text-white text-sm"
                            >
                                <option value="">選擇帳戶</option>
                                {availableAccounts.filter(a => a.id !== accountId).map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                value={targetAmount}
                                onChange={e => setTargetAmount(e.target.value)}
                                className="w-32 bg-gray-700 border border-gray-600 focus:border-blue-500 rounded-lg py-2 px-3 outline-none text-white text-sm font-bold placeholder-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:m-0"
                                placeholder="0.00"
                                readOnly={type === 'exchange'}
                            />
                        </div>
                    </div>
                )}

                {/* Exchange Rate for Exchange */}
                {type === 'exchange' && (
                    <div className="flex justify-center mt-2">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <label>匯率:</label>
                            <input
                                type="number"
                                value={exchangeRate}
                                onChange={e => setExchangeRate(e.target.value)}
                                className="w-20 bg-gray-700 border border-gray-600 focus:border-blue-500 rounded-lg py-1 px-2 outline-none text-white text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:m-0"
                                step="0.01"
                                min="0"
                            />
                            <span>1 {currency} = {exchangeRate} {targetCurrency}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Category */}
            {(type === 'expense' || type === 'income') && (
                <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-400 mb-1">� 分類</label>
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
        </div>
    );
};
