import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { simpleDriveService } from '../../services/simpleDrive';
import type { UserSettings } from '../../services/simpleDrive';

export const AccountSettings: React.FC = () => {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Form State
    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountType, setNewAccountType] = useState<'cash' | 'bank' | 'credit'>('cash');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const s = await simpleDriveService.getSettings();
        setSettings(s);
    };

    const handleAddAccount = async () => {
        if (!newAccountName || !settings) return;

        const newAccount = {
            id: `acc_${Date.now()}`,
            name: newAccountName,
            type: newAccountType,
            balance: 0 // Initial balance Logic to be added later via Adjustment Transaction if needed
        };

        const updatedSettings: UserSettings = {
            ...settings,
            accounts: [...(settings.accounts || []), newAccount]
        };

        await simpleDriveService.saveSettings(updatedSettings);
        setSettings(updatedSettings);
        setIsAdding(false);
        setNewAccountName('');
        setNewAccountType('cash');
    };

    if (!settings) return <div className="text-gray-500 text-center py-4">Loading...</div>;

    return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-gray-300 font-bold text-lg">{t('account_settings.title', 'Accounts')}</h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-blue-400 font-bold text-sm bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition-colors"
                >
                    {isAdding ? t('common.cancel', 'Cancel') : t('account_settings.add_account', '+ Add')}
                </button>
            </div>

            {/* Add Account Form */}
            {isAdding && (
                <div className="bg-gray-700/50 rounded-xl p-4 mb-6 border border-gray-600 animate-slide-down">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">{t('account_settings.account_name')}</label>
                            <input
                                type="text"
                                value={newAccountName}
                                onChange={(e) => setNewAccountName(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                placeholder="e.g. My Savings"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">{t('account_settings.account_type')}</label>
                            <div className="flex gap-2">
                                {(['cash', 'bank', 'credit'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setNewAccountType(type)}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-colors ${newAccountType === type
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-800 text-gray-400 hover:bg-gray-600'
                                            }`}
                                    >
                                        {t(`transaction.accounts.${type}`)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={handleAddAccount}
                            disabled={!newAccountName}
                            className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {t('common.save', 'Save')}
                        </button>
                    </div>
                </div>
            )}

            {/* Account List */}
            <div className="space-y-3">
                {settings.accounts?.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className={`
                                w-10 h-10 rounded-full flex items-center justify-center
                                ${acc.type === 'cash' ? 'bg-green-500/10 text-green-400' : ''}
                                ${acc.type === 'bank' ? 'bg-blue-500/10 text-blue-400' : ''}
                                ${acc.type === 'credit' ? 'bg-purple-500/10 text-purple-400' : ''}
                            `}>
                                {/* Icons based on type */}
                                {acc.type === 'cash' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                                {acc.type === 'bank' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>}
                                {acc.type === 'credit' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
                            </div>
                            <div>
                                <h4 className="text-white font-medium">{acc.name}</h4>
                                <p className="text-xs text-gray-500 capitalize">{t(`transaction.accounts.${acc.type}`)}</p>
                            </div>
                        </div>
                        {/* Future: Edit/Delete buttons */}
                    </div>
                ))}
            </div>
        </div>
    );
};
