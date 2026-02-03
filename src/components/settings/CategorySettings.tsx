import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { simpleDriveService } from '../../services/simpleDrive';
import type { UserSettings } from '../../services/userSettingsService';

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

    const handleAddCategory = async () => {
        if (!settings || !newCategory.trim()) return;

        const newCategoryObj = {
            id: newCategory.toLowerCase().replace(/\s+/g, '_'),
            name: newCategory.trim(),
            color: activeTab === 'expense' ? '#ef4444' : '#10b981'
        };

        const updatedSettings: UserSettings = {
            ...settings,
            categories: {
                ...settings.categories,
                [activeTab]: [...(settings.categories[activeTab] || []), newCategoryObj]
            }
        };

        try {
            await simpleDriveService.saveSettings(updatedSettings);
            setSettings(updatedSettings);
            setNewCategory('');
        } catch (error) {
            console.error("Failed to add category", error);
        }
    };

    const handleDeleteCategory = async (category: { id: string; name: string; color: string }) => {
        if (!settings) return;
        
        const confirmDelete = window.confirm(t('settings.confirm_delete_category', 'Are you sure?'));
        if (!confirmDelete) return;

        const updatedSettings: UserSettings = {
            ...settings,
            categories: {
                ...settings.categories,
                [activeTab]: settings.categories[activeTab].filter(cat => cat.id !== category.id)
            }
        };

        try {
            await simpleDriveService.saveSettings(updatedSettings);
            setSettings(updatedSettings);
        } catch (error) {
            console.error("Failed to delete category", error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="p-6 text-center text-gray-400">
                {t('settings.load_failed', 'Failed to load settings')}
            </div>
        );
    }

    const currentCategories = settings.categories[activeTab] || [];

    return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-gray-300 font-semibold mb-4">分類設定</h3>
            
            {/* Tab Switcher */}
            <div className="flex bg-gray-700 rounded-xl p-1 mb-4">
                <button
                    onClick={() => setActiveTab('expense')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                        activeTab === 'expense'
                            ? 'bg-red-600 text-white'
                            : 'text-gray-400 hover:text-white'
                    }`}
                >
                    {t('transaction.expense', 'Expense')}
                </button>
                <button
                    onClick={() => setActiveTab('income')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                        activeTab === 'income'
                            ? 'bg-green-600 text-white'
                            : 'text-gray-400 hover:text-white'
                    }`}
                >
                    {t('transaction.income', 'Income')}
                </button>
            </div>

            {/* Add New Category */}
            <div className="mb-4">
                <h4 className="text-white font-medium mb-3">
                    {t('settings.add_category', 'Add Category')}
                </h4>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder={t('settings.category_placeholder', 'Enter category name')}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                    />
                    <button
                        onClick={handleAddCategory}
                        disabled={!newCategory.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-all"
                    >
                        {t('common.add', 'Add')}
                    </button>
                </div>
            </div>

            {/* Category List */}
            <div>
                <h4 className="text-white font-medium mb-3">
                    {t('settings.category_list', 'Categories')} ({currentCategories.length})
                </h4>
                {currentCategories.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <div className="mb-2">
                            <svg className="w-12 h-12 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <p>{t('settings.no_categories', 'No categories yet')}</p>
                        <p className="text-sm mt-1">{t('settings.add_first_category', 'Add your first category above')}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {currentCategories.map((category) => (
                            <div
                                key={category.id}
                                className="flex items-center justify-between bg-gray-700 rounded-lg px-3 py-2 group hover:bg-gray-600 transition-all"
                            >
                                <div className="flex items-center space-x-2">
                                    <div 
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: category.color }}
                                    />
                                    <span className="text-white">
                                        {category.name}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleDeleteCategory(category)}
                                    className="text-red-400 hover:text-red-300 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                    title={t('common.delete', 'Delete')}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
