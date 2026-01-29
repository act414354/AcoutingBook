import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { simpleDriveService } from '../../services/simpleDrive';
import type { UserSettings } from '../../services/simpleDrive';

export const AccountBalanceCard: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [accounts, setAccounts] = useState<UserSettings['accounts']>([]);
    const [balances, setBalances] = useState<Record<string, Record<string, number>>>({});
    const [displayCurrency, setDisplayCurrency] = useState('TWD');

    useEffect(() => {
        if (i18n.language.includes('en')) setDisplayCurrency('USD');
        else if (i18n.language.includes('ja')) setDisplayCurrency('JPY');
        else if (i18n.language.includes('de')) setDisplayCurrency('EUR');
        else setDisplayCurrency('TWD');
    }, [i18n.language]);

    useEffect(() => {
        const loadData = async () => {
            const settings = await simpleDriveService.getSettings();
            setAccounts(settings.accounts || []);

            const currentBalances = simpleDriveService.getAccountBalances();
            setBalances(currentBalances);
        };
        loadData();

        const interval = setInterval(loadData, 2000);
        return () => clearInterval(interval);
    }, []);

    const getEstimatedTotal = (accBal: Record<string, number>) => {
        // Mock Rates (Should match AccountsScreen logic or be centralized)
        const rates: Record<string, number> = {
            'TWD': 1, 'USD': 30, 'JPY': 0.22, 'KRW': 0.025, 'EUR': 33, 'USDT': 30, 'USDC': 30
        };

        let totalInTWD = 0;
        Object.entries(accBal).forEach(([curr, amt]) => {
            const rate = rates[curr] || 1;
            totalInTWD += amt * rate;
        });

        const targetRate = rates[displayCurrency] || 1;
        return totalInTWD / targetRate;
    };

    if (!accounts || accounts.length === 0) return null;

    return (
        <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800 shadow-xl">
            <h3 className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wider">{t('dashboard.account_balances', 'Account Balances')} ({displayCurrency})</h3>
            <div className="grid grid-cols-2 gap-3">
                {accounts.map(acc => {
                    const accBal = balances[acc.id] || {};
                    const estimatedVal = getEstimatedTotal(accBal);

                    return (
                        <div key={acc.id} className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 flex flex-col">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-2 h-2 rounded-full ${acc.type === 'cash' ? 'bg-green-400' :
                                    acc.type === 'bank' ? 'bg-blue-400' : 'bg-purple-400'
                                    }`}></div>
                                <span className="text-xs text-gray-400 truncate font-bold">{acc.name}</span>
                            </div>
                            <span className={`text-lg font-bold ${estimatedVal < 0 ? 'text-red-400' : 'text-white'}`}>
                                {estimatedVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
