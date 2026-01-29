import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { simpleDriveService } from '../services/simpleDrive';
import type { UserSettings } from '../services/simpleDrive';

interface AccountsScreenProps {
    lastRefresh?: number;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({ lastRefresh }) => {
    const { t, i18n } = useTranslation();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [balances, setBalances] = useState<Record<string, Record<string, number>>>({});
    const [loading, setLoading] = useState(true);
    const [displayCurrency, setDisplayCurrency] = useState('TWD');

    useEffect(() => {
        // Language -> Currency Mapping
        if (i18n.language.includes('en')) setDisplayCurrency('USD');
        else if (i18n.language.includes('ja')) setDisplayCurrency('JPY');
        else if (i18n.language.includes('ko')) setDisplayCurrency('KRW');
        else if (i18n.language.includes('de')) setDisplayCurrency('EUR');
        else setDisplayCurrency('TWD');
    }, [i18n.language]);

    useEffect(() => {
        loadData();
    }, [lastRefresh]); // React to refresh trigger

    const loadData = async () => {
        setLoading(true);
        const s = await simpleDriveService.getSettings();
        const b = simpleDriveService.getAccountBalances(); // Now returns Record<accId, Record<curr, amt>>
        setSettings(s);
        setBalances(b);
        setLoading(false);
    };

    const getEstimatedTotal = () => {
        // Mock Rates for Demo
        const rates: Record<string, number> = {
            'TWD': 1,
            'USD': 30, // 1 USD = 30 TWD
            'JPY': 0.22,
            'KRW': 0.025,
            'EUR': 33,
            'USDT': 30,
            'USDC': 30
        };

        let totalInTWD = 0;

        Object.values(balances).forEach(accBals => {
            Object.entries(accBals).forEach(([curr, amt]) => {
                const rate = rates[curr] || 1; // Default to 1 if unknown (risky but ok for demo)
                totalInTWD += amt * rate;
            });
        });

        // Convert TWD Total to Display Currency
        const targetRate = rates[displayCurrency] || 1;
        return (totalInTWD / targetRate);
    };

    if (loading) {
        return <div className="text-center text-gray-500 py-10">{t('common.loading')}</div>;
    }

    if (!settings || !settings.accounts) {
        return <div className="text-center text-gray-500 py-10">{t('common.error_load')}</div>;
    }

    const totalAssets = getEstimatedTotal();

    // Group accounts by type? Or just list them? Listing is fine.
    // We need to render multiple lines for balances if multiple currencies exist.

    const renderBalance = (accId: string) => {
        const accBal = balances[accId] || {};
        const entries = Object.entries(accBal).filter(([_, amt]) => amt !== 0);

        if (entries.length === 0) return <p className="text-white font-bold text-lg">0 <span className="text-xs text-gray-500">{displayCurrency}</span></p>;

        return (
            <div className="flex flex-col items-end">
                {entries.map(([curr, amt]) => (
                    <p key={curr} className="text-white font-bold text-lg">
                        {amt.toLocaleString()} <span className="text-xs text-gray-500 ml-1">{curr}</span>
                    </p>
                ))}
            </div>
        );
    };

    return (
        <div className="pb-24 px-4 pt-4 min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">{t('account_settings.title', 'Accounts')}</h1>
                <button
                    onClick={() => {
                        // Navigate to Settings -> Account Settings
                        // We trigger a click on the 'Settings' tab in text
                        // This is a hack, ideally we use Context to switch tab. 
                        // Assuming text content match.
                        const navItems = document.querySelectorAll('p'); // BottomNav labels usually in p or span
                        // Actually BottomNav labels.
                        // Let's try locating the Settings button in Bottom Nav safely.
                        // Filter by text content.
                        const settingsTab = Array.from(document.querySelectorAll('div[role="button"]')).find(el => el.textContent?.includes(t('dashboard.settings')));
                        if (settingsTab) (settingsTab as HTMLElement).click();

                        // Also try to find a way to open "Account Settings" sub-section if possible.
                        // In Real app, we'd pass a param. For now, user just navigates to Settings.
                    }}
                    className="text-blue-400 text-sm font-bold bg-blue-500/10 px-3 py-1.5 rounded-lg"
                >
                    {t('account_settings.edit_account', 'Edit')}
                </button>
            </div>

            {/* Total Net Worth Card */}
            <div className="bg-gradient-to-br from-blue-900 to-gray-800 rounded-2xl p-6 mb-6 shadow-xl border border-blue-500/20">
                <p className="text-blue-300 text-sm font-medium mb-1">{t('dashboard.total_net_worth')}</p>
                <h2 className="text-3xl font-bold text-white">
                    ${totalAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    <span className="text-base text-gray-400 font-normal ml-2">{displayCurrency}</span>
                </h2>
                <p className="text-xs text-gray-500 mt-2">
                    * {t('dashboard.estimated_value', 'Estimated Value')}
                </p>
            </div>

            {/* Accounts List */}
            <div className="space-y-4">
                {settings.accounts.map((acc) => (
                    <div key={acc.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className={`
                                w-12 h-12 rounded-full flex items-center justify-center
                                ${acc.type === 'cash' ? 'bg-green-500/10 text-green-400' : ''}
                                ${acc.type === 'bank' ? 'bg-blue-500/10 text-blue-400' : ''}
                                ${acc.type === 'credit' ? 'bg-purple-500/10 text-purple-400' : ''}
                                ${acc.type === 'ewallet' ? 'bg-yellow-500/10 text-yellow-400' : ''}
                                ${acc.type === 'securities' ? 'bg-indigo-500/10 text-indigo-400' : ''}
                                ${acc.type === 'exchange' ? 'bg-orange-500/10 text-orange-400' : 'bg-gray-700 text-gray-400'}
                            `}>
                                {/* Icons based on type */}
                                {acc.type === 'cash' && <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                                {acc.type === 'bank' && <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>}
                                {acc.type === 'credit' && <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
                                {acc.type === 'ewallet' && <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                                {acc.type === 'securities' && <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>}
                                {acc.type === 'exchange' && <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            </div>
                            <div>
                                <h3 className="text-white font-bold">{acc.name}</h3>
                                <p className="text-xs text-gray-500 capitalize">{t(`transaction.accounts.${acc.type}`)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {renderBalance(acc.id)}

                            {/* Properties Info Badge */}
                            {acc.properties?.linkedAccountId && (
                                <span className="inline-block bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full mt-1">
                                    Linked
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
