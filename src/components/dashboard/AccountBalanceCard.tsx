import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { simpleDriveService } from '../../services/simpleDrive';
import type { UserSettings } from '../../services/simpleDrive';

export const AccountBalanceCard: React.FC = () => {
    const { t } = useTranslation();
    const [accounts, setAccounts] = useState<UserSettings['accounts']>([]);
    const [balances, setBalances] = useState<Record<string, number>>({});

    useEffect(() => {
        const loadData = async () => {
            const settings = await simpleDriveService.getSettings();
            setAccounts(settings.accounts || []);

            const currentBalances = simpleDriveService.getAccountBalances();
            setBalances(currentBalances);
        };
        loadData();

        // Poll for updates (simplified for now, ideally context based)
        const interval = setInterval(loadData, 2000);
        return () => clearInterval(interval);
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('zh-TW', {
            style: 'currency',
            currency: 'TWD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (!accounts || accounts.length === 0) return null;

    return (
        <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800 shadow-xl">
            <h3 className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wider">{t('dashboard.account_balances', 'Account Balances')}</h3>
            <div className="grid grid-cols-2 gap-3">
                {accounts.map(acc => {
                    const balance = balances[acc.id] || 0;
                    return (
                        <div key={acc.id} className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 flex flex-col">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-2 h-2 rounded-full ${acc.type === 'cash' ? 'bg-green-400' :
                                        acc.type === 'bank' ? 'bg-blue-400' : 'bg-purple-400'
                                    }`}></div>
                                <span className="text-xs text-gray-400 truncate font-bold">{acc.name}</span>
                            </div>
                            <span className={`text-lg font-bold ${balance < 0 ? 'text-red-400' : 'text-white'}`}>
                                {formatCurrency(balance)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
