import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserSettings } from '../../services/simpleDrive';

interface AccountFormProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'add' | 'edit';
    settings: UserSettings | null;
    initialData?: any;
    onSave: (accountData: any) => Promise<void>;
}

export const AccountForm: React.FC<AccountFormProps> = ({ 
    isOpen, 
    onClose, 
    mode, 
    settings, 
    initialData,
    onSave 
}) => {
    const { t } = useTranslation();

    // Form State
    const [accountName, setAccountName] = useState('');
    const [accountType, setAccountType] = useState<'cash' | 'bank' | 'credit' | 'ewallet' | 'securities' | 'exchange'>('cash');
    const [initialBalance, setInitialBalance] = useState<number>(0);
    
    // Credit Card Fields
    const [statementDay, setStatementDay] = useState<number>(1);
    const [paymentDay, setPaymentDay] = useState<number>(1);
    const [autoPaymentAccountId, setAutoPaymentAccountId] = useState<string>('');
    
    // E-Wallet Fields
    const [autoTopUp, setAutoTopUp] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState<number>(1000);
    
    // Securities Fields
    const [feeDiscount, setFeeDiscount] = useState<number>(1);
    const [minFee, setMinFee] = useState<number>(20);
    
    // Linking
    const [linkedAccountId, setLinkedAccountId] = useState('');

    // Initialize form data
    React.useEffect(() => {
        if (mode === 'edit' && initialData) {
            setAccountName(initialData.name || '');
            setAccountType(initialData.type || 'cash');
            setInitialBalance(initialData.balance || 0);
            
            const props = initialData.properties;
            
            if (initialData.type === 'credit' && props?.creditCard) {
                setStatementDay(props.creditCard.statementDay || 1);
                setPaymentDay(props.creditCard.paymentDay || 10);
                setAutoPaymentAccountId(props.creditCard.autoPayAccountId || '');
            }
            
            if (initialData.type === 'ewallet' && props?.eWallet) {
                setAutoTopUp(props.eWallet.autoTopUp || false);
                setTopUpAmount(props.eWallet.amount || 1000);
            }
            
            if (initialData.type === 'securities' && props?.securities) {
                setFeeDiscount(props.securities.feeDiscount || 1);
                setMinFee(props.securities.minFee || 20);
            }
            
            if ((initialData.type === 'ewallet' || initialData.type === 'securities' || initialData.type === 'exchange') && props?.linkedAccountId) {
                setLinkedAccountId(props.linkedAccountId || '');
            }
        } else {
            // Reset form for add mode
            setAccountName('');
            setAccountType('cash');
            setInitialBalance(0);
            setStatementDay(1);
            setPaymentDay(10);
            setAutoPaymentAccountId('');
            setAutoTopUp(false);
            setTopUpAmount(1000);
            setFeeDiscount(1);
            setMinFee(20);
            setLinkedAccountId('');
        }
    }, [mode, initialData]);

    const handleSubmit = async () => {
        if (!accountName) return;

        const accountData = {
            name: accountName,
            type: accountType,
            balance: initialBalance,
            properties: {
                linkedAccountId: (accountType === 'ewallet' || accountType === 'securities' || accountType === 'exchange') ? linkedAccountId : undefined,
                creditCard: accountType === 'credit' ? {
                    statementDay,
                    paymentDay,
                    businessDayLogic: 'delay' as const,
                    autoPayAccountId: autoPaymentAccountId || undefined
                } : undefined,
                eWallet: accountType === 'ewallet' ? {
                    autoTopUp,
                    amount: topUpAmount
                } : undefined,
                securities: accountType === 'securities' ? {
                    feeDiscount,
                    minFee
                } : undefined
            }
        };

        await onSave(accountData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">
                        {mode === 'add' ? t('account_settings.add_account', '新增帳戶') : t('account_settings.edit_account', '編輯帳戶')}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    {/* Account Type */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">{t('account_settings.account_type', '帳戶類型')}</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['cash', 'bank', 'credit', 'ewallet', 'securities', 'exchange'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setAccountType(type)}
                                    className={`py-2 rounded-lg text-xs font-bold capitalize transition-colors ${accountType === type
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-600'
                                        }`}
                                >
                                    {t(`transaction.accounts.${type}`, { defaultValue: type })}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Account Name */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">{t('account_settings.account_name', '帳戶名稱')}</label>
                        <input
                            type="text"
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                        />
                    </div>

                    {/* Initial Balance */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">{t('account_settings.initial_balance', '初始餘額')}</label>
                        <input
                            type="number"
                            value={initialBalance}
                            onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                        />
                    </div>

                    {/* Credit Card Settings */}
                    {accountType === 'credit' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">{t('account_settings.statement_day', '結帳日')}</label>
                                    <input
                                        type="number"
                                        min="1" max="31"
                                        value={statementDay}
                                        onChange={(e) => setStatementDay(parseInt(e.target.value))}
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">{t('account_settings.payment_day', '繳款日')}</label>
                                    <input
                                        type="number"
                                        min="1" max="31"
                                        value={paymentDay}
                                        onChange={(e) => setPaymentDay(parseInt(e.target.value))}
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">{t('account_settings.auto_payment_account', '自動扣款帳戶')}</label>
                                <select
                                    value={autoPaymentAccountId}
                                    onChange={(e) => setAutoPaymentAccountId(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                                >
                                    <option value="">{t('common.none', 'None')}</option>
                                    {settings?.accounts?.filter(a => a.type === 'bank').map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Linked Account for E-Wallet/Securities/Exchange */}
                    {(accountType === 'ewallet' || accountType === 'securities' || accountType === 'exchange') && (
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">{t('account_settings.linked_account', '連結帳戶')}</label>
                            <select
                                value={linkedAccountId}
                                onChange={(e) => setLinkedAccountId(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                            >
                                {accountType !== 'securities' && <option value="">{t('common.none', 'None')}</option>}
                                {settings?.accounts?.filter(a => a.type === 'bank').map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* E-Wallet Settings */}
                    {accountType === 'ewallet' && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={autoTopUp}
                                    onChange={(e) => setAutoTopUp(e.target.checked)}
                                    id="autoTopUp"
                                    className="w-4 h-4"
                                />
                                <label htmlFor="autoTopUp" className="text-sm text-gray-300">{t('account_settings.auto_topup', '自動儲值')}</label>
                            </div>
                            {autoTopUp && (
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">{t('account_settings.topup_amount', 'Top-up Amount')}</label>
                                    <input
                                        type="number"
                                        value={topUpAmount}
                                        onChange={(e) => setTopUpAmount(parseInt(e.target.value) || 1000)}
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Securities Settings */}
                    {accountType === 'securities' && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-gray-300 mb-2">{t('account_settings.fee_settings', '手續費設定')}</h4>
                            
                            {/* Fee Discount */}
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">{t('account_settings.fee_discount', '手續費折扣')}</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.1"
                                        max="2"
                                        value={feeDiscount}
                                        onChange={(e) => setFeeDiscount(parseFloat(e.target.value) || 0)}
                                        className="flex-1 bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                                    />
                                    <span className="text-gray-400 text-sm">折</span>
                                </div>
                                {feeDiscount && (
                                    <p className="text-xs text-blue-400 mt-1">
                                        {`買${(0.1425 * feeDiscount / 10).toFixed(4)}% + 賣${(0.1425 * feeDiscount / 10).toFixed(4)}% + 交易稅0.3% = 總交易手續費${((0.1425 * feeDiscount / 10 * 2) + 0.3).toFixed(4)}%`}
                                    </p>
                                )}
                            </div>

                            {/* Minimum Fee */}
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">{t('account_settings.min_fee', '最低手續費')}</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={minFee}
                                    onChange={(e) => setMinFee(parseInt(e.target.value) || 0)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                                />
                                {settings?.accounts?.filter(acc => acc.type === 'securities' && acc.properties?.securities).map(acc => (
                                    <div key={acc.id} className="text-xs text-gray-500 mt-1">
                                        {acc.properties?.securities && 
                                            `最低交易金額(${Math.ceil(acc.properties.securities.minFee / ((0.1425 * acc.properties.securities.feeDiscount / 10 * 2) + 0.3) * 10000)}/總交易手續費${((0.1425 * acc.properties.securities.feeDiscount / 10 * 2) + 0.3).toFixed(4)}%)元`
                                        }
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={!accountName}
                        className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {t('common.save', '儲存')}
                    </button>
                </div>
            </div>
        </div>
    );
};
