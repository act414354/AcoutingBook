import React, { useState, useEffect } from 'react';
import { simpleDriveService } from '../../services/simpleDrive';
import type { UserSettings } from '../../services/simpleDrive';
import { useTranslation } from 'react-i18next';

export const CategorySettings: React.FC = () => {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [newCategory, setNewCategory] = useState('');
    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await simpleDriveService.getSettings();
            setSettings(data);
        } catch (error) {
            console.error("Failed to load settings", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newCategory.trim() || !settings) return;

        // Deep copy to avoid mutation issues
        const updatedSettings: UserSettings = {
            ...settings,
            categories: {
                ...settings.categories,
                [activeTab]: [...settings.categories[activeTab], newCategory.trim()]
            }
        };

        setSettings(updatedSettings);
        setNewCategory('');
        await simpleDriveService.saveSettings(updatedSettings);
    };

    const handleDelete = async (index: number) => {
        if (!settings) return;
        const confirmDelete = window.confirm(t('settings.confirm_delete_category', 'Are you sure?'));
        if (!confirmDelete) return;

        const updatedSettings: UserSettings = {
            ...settings,
            categories: {
                ...settings.categories,
                [activeTab]: settings.categories[activeTab].filter((_, i) => i !== index)
            }
        };

        setSettings(updatedSettings);
        await simpleDriveService.saveSettings(updatedSettings);
    };

    if (loading) return <div className="text-center text-gray-500 py-8">Loading...</div>;
    if (!settings) return <div className="text-center text-red-500">Failed to load settings</div>;

    return (
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="text-gray-300 font-semibold mb-4">{t('settings.manage_categories', 'Manage Categories')}</h3>

            {/* Tabs */}
            <div className="flex bg-gray-900 rounded-lg p-1 mb-4">
                <button
                    onClick={() => setActiveTab('expense')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${activeTab === 'expense' ? 'bg-red-500/20 text-red-400' : 'text-gray-500'
                        }`}
                >
                    {t('transaction.expense')}
                </button>
                <button
                    onClick={() => setActiveTab('income')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${activeTab === 'income' ? 'bg-green-500/20 text-green-400' : 'text-gray-500'
                        }`}
                >
                    {t('transaction.income')}
                </button>
            </div>

            {/* List */}
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                {settings.categories[activeTab].map((cat, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-700/30 px-3 py-2 rounded-lg">
                        <span className="text-white text-sm">
                            {t(`transaction.categories.${cat.toLowerCase()}`, { defaultValue: cat })}
                        </span>
                        <button
                            onClick={() => handleDelete(index)}
                            className="text-red-400 hover:text-red-300 p-1"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>

            {/* Add New */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder={t('settings.add_category_placeholder', 'New Category...')}
                    className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <button
                    onClick={handleAdd}
                    disabled={!newCategory.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    +
                </button>
            </div>
        </div>
    );
};
