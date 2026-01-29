import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { simpleDriveService } from '../../services/simpleDrive';
import type { UserSettings } from '../../services/simpleDrive';
import { AccountForm } from './AccountForm';

export const AccountSettings: React.FC = () => {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [editingAccount, setEditingAccount] = useState<any>(null);

    // Edit State
    const [isEditMode, setIsEditMode] = useState(false);
    const [draggedAccountId, setDraggedAccountId] = useState<string | null>(null);
    const [dragOverAccountId, setDragOverAccountId] = useState<string | null>(null);

    useEffect(() => {
        loadSettings();

        // Listen for external trigger to open Add Account
        const handleOpenAdd = () => setIsAdding(true);
        window.addEventListener('OPEN_ADD_ACCOUNT', handleOpenAdd);
        return () => window.removeEventListener('OPEN_ADD_ACCOUNT', handleOpenAdd);
    }, []);

    const loadSettings = async () => {
        const s = await simpleDriveService.getSettings();
        setSettings(s);
    };

    const handleEditAccount = (account: any) => {
        setEditingAccount(account);
    };

    const handleAddAccount = () => {
        setIsAdding(true);
    };

    const handleSaveAccount = async (accountData: any) => {
        if (!settings) return;

        if (editingAccount) {
            // Update existing account
            const updatedSettings: UserSettings = {
                ...settings,
                accounts: settings.accounts.map(acc => 
                    acc.id === editingAccount.id 
                        ? { ...acc, ...accountData }
                        : acc
                )
            };
            await simpleDriveService.saveSettings(updatedSettings);
            setSettings(updatedSettings);
            setEditingAccount(null);
        } else {
            // Add new account
            const newAccount = {
                id: `acc_${Date.now()}`,
                ...accountData,
                currency: 'TWD'
            };
            const updatedSettings: UserSettings = {
                ...settings,
                accounts: [...settings.accounts, newAccount]
            };
            await simpleDriveService.saveSettings(updatedSettings);
            setSettings(updatedSettings);
            setIsAdding(false);
        }
    };

    const handleDeleteAccount = async (accountId: string) => {
        if (!settings) return;
        
        if (!confirm(t('account_settings.confirm_delete', '確定要刪除此帳戶嗎？'))) {
            return;
        }

        const updatedSettings: UserSettings = {
            ...settings,
            accounts: settings.accounts.filter(acc => acc.id !== accountId)
        };

        await simpleDriveService.saveSettings(updatedSettings);
        setSettings(updatedSettings);
    };

    const handleDragStart = (accountId: string) => {
        setDraggedAccountId(accountId);
    };

    const handleDragOver = (e: React.DragEvent, accountId: string) => {
        e.preventDefault();
        setDragOverAccountId(accountId);
    };

    const handleDragLeave = () => {
        setDragOverAccountId(null);
    };

    const handleDrop = async (e: React.DragEvent, targetAccountId: string) => {
        e.preventDefault();
        setDragOverAccountId(null);

        if (!draggedAccountId || draggedAccountId === targetAccountId || !settings) return;

        const draggedIndex = settings.accounts.findIndex(acc => acc.id === draggedAccountId);
        const targetIndex = settings.accounts.findIndex(acc => acc.id === targetAccountId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        const newAccounts = [...settings.accounts];
        const [draggedAccount] = newAccounts.splice(draggedIndex, 1);
        newAccounts.splice(targetIndex, 0, draggedAccount);

        const updatedSettings: UserSettings = {
            ...settings,
            accounts: newAccounts
        };

        await simpleDriveService.saveSettings(updatedSettings);
        setSettings(updatedSettings);
        setDraggedAccountId(null);
    };

    const handleDragEnd = () => {
        setDraggedAccountId(null);
        setDragOverAccountId(null);
    };

    if (!settings) return <div className="text-gray-500 text-center py-4">{t('common.loading')}</div>;

    return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-gray-300 font-bold text-lg">{t('account_settings.title', 'Accounts')}</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className="text-blue-400 font-bold text-sm bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition-colors"
                    >
                        {isEditMode ? t('account_settings.view_mode', '檢視模式') : t('account_settings.edit_account', '編輯帳戶')}
                    </button>
                    <button
                        onClick={handleAddAccount}
                        className="text-blue-400 font-bold text-sm bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition-colors"
                    >
                        {t('account_settings.add_account', '新增帳戶')}
                    </button>
                </div>
            </div>

            {/* Account List */}
            <div className="space-y-3">
                {settings.accounts?.map(acc => (
                    <div 
                        key={acc.id} 
                        className={`flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border transition-all ${
                            dragOverAccountId === acc.id ? 'border-blue-400 bg-blue-900/20' : 'border-gray-800'
                        } ${isEditMode ? 'cursor-move' : ''}`}
                        draggable={isEditMode}
                        onDragStart={() => handleDragStart(acc.id)}
                        onDragOver={(e) => handleDragOver(e, acc.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, acc.id)}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="flex items-center gap-3">
                            {isEditMode && (
                                <div className="text-gray-400 cursor-move">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </div>
                            )}
                            <div className={`
                                w-10 h-10 rounded-full flex items-center justify-center
                                ${acc.type === 'cash' ? 'bg-green-500/10 text-green-400' : ''}
                                ${acc.type === 'bank' ? 'bg-blue-500/10 text-blue-400' : ''}
                                ${acc.type === 'credit' ? 'bg-purple-500/10 text-purple-400' : ''}
                                ${acc.type === 'ewallet' ? 'bg-orange-500/10 text-orange-400' : ''}
                                ${acc.type === 'securities' ? 'bg-cyan-500/10 text-cyan-400' : ''}
                                ${acc.type === 'exchange' ? 'bg-red-500/10 text-red-400' : ''}
                            `}>
                                {/* Icons based on type */}
                                {acc.type === 'cash' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                                {acc.type === 'bank' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>}
                                {acc.type === 'credit' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
                                {acc.type === 'ewallet' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                                {acc.type === 'securities' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                                {acc.type === 'exchange' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>}
                            </div>
                            <div>
                                <h4 className="text-white font-medium">{acc.name}</h4>
                                <p className="text-xs text-gray-500 capitalize">{t(`transaction.accounts.${acc.type}`)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isEditMode && (
                                <>
                                    <button
                                        onClick={() => handleEditAccount(acc)}
                                        className="text-blue-400 hover:text-blue-300 p-1"
                                        title={t('account_settings.edit_account', '編輯帳戶')}
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteAccount(acc.id)}
                                        className="text-red-400 hover:text-red-300 p-1"
                                        title={t('account_settings.delete_account', '刪除')}
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Account Form Modal */}
            <AccountForm
                isOpen={isAdding || !!editingAccount}
                onClose={() => {
                    setIsAdding(false);
                    setEditingAccount(null);
                }}
                mode={editingAccount ? 'edit' : 'add'}
                settings={settings}
                initialData={editingAccount}
                onSave={handleSaveAccount}
            />
        </div>
    );
};
