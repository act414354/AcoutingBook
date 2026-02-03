import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { simpleDriveService } from '../../services/simpleDrive';
import type { UserSettings } from '../../services/userSettingsService';

export const CurrencySettings: React.FC = () => {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [newCurrency, setNewCurrency] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await simpleDriveService.getSettings();
            setSettings(data);
        } catch (error) {
            console.error("Failed to load settings", error);
        }
    };

    const handleAdd = async () => {
        if (!newCurrency || !settings) return;
        const upper = newCurrency.toUpperCase().trim();
        
        // 新的結構中，我們可以將自定義貨幣添加到 preferences 中
        const updated = {
            ...settings,
            preferences: {
                ...settings.preferences,
                customCurrencies: [...(settings.preferences.customCurrencies || ['TWD', 'USD', 'JPY']), upper]
            }
        };
        await simpleDriveService.saveSettings(updated);
        setSettings(updated);
        setNewCurrency('');
        setIsAdding(false);
    };

    const handleRemove = async (curr: string) => {
        if (!settings) return;
        if (!confirm(t('settings.confirm_delete_currency', 'Delete currency?'))) return;

        const updated = {
            ...settings,
            preferences: {
                ...settings.preferences,
                customCurrencies: settings.preferences.customCurrencies?.filter(c => c !== curr) || []
            }
        };
        await simpleDriveService.saveSettings(updated);
        setSettings(updated);
    };

    if (!settings) return null;
    // Only show if module is enabled? Or always if we want users to manage currencies?
    // User requirement: "Open this module... in settings add a currency settings".
    // So likely bounded by module status. We'll handle visibility in App.tsx or parent.
    // BUT checking settings.modules.exchange_rate here is safer.
    if (!settings.modules?.exchange_rate) return null;

    return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 animate-slide-down">
            <h3 className="text-gray-300 font-bold mb-4">{t('settings.currency_settings', 'Currency Settings')}</h3>

            <div className="flex flex-wrap gap-2 mb-4">
                {settings.preferences.customCurrencies?.map(curr => (
                    <div key={curr} className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-600">
                        <span className="text-white font-bold">{curr}</span>
                        <button
                            onClick={() => handleRemove(curr)}
                            className="text-gray-500 hover:text-red-400"
                        >
                            ×
                        </button>
                    </div>
                ))}
                <button
                    onClick={() => setIsAdding(true)}
                    className="px-3 py-1.5 rounded-lg border border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                >
                    + {t('common.add', 'Add')}
                </button>
            </div>

            {isAdding && (
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newCurrency}
                        onChange={e => setNewCurrency(e.target.value)}
                        className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-white outline-none uppercase placeholder-gray-500"
                        placeholder="USD, EUR..."
                        maxLength={5}
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!newCurrency}
                        className="bg-blue-600 px-4 py-2 rounded-lg text-white font-bold disabled:opacity-50"
                    >
                        {t('common.save', 'Save')}
                    </button>
                </div>
            )}
        </div>
    );
};
