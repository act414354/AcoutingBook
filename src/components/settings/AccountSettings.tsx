import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { simpleDriveService } from '../../services/simpleDrive';
import { userSettingsService } from '../../services/userSettingsService';
import type { UserSettings } from '../../services/userSettingsService';
import { AccountForm } from './AccountForm';

export const AccountSettings: React.FC = () => {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [editingAccount, setEditingAccount] = useState<any>(null);

    // Edit State
    const [isEditMode, setIsEditMode] = useState(false);
    const [showDeletedAccounts, setShowDeletedAccounts] = useState(false);
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
            // 檢查帳戶數量限制（最多 1000 個）
            const existingAccounts = settings.accounts || [];
            if (!userSettingsService.canAddAccount(existingAccounts)) {
                console.warn('❌ 帳戶數量已達上限 (1000 個)');
                return; // 靜默失敗，不顯示任何 UI 變化
            }
            
            // 生成流水號：找到現有帳戶的最大流水號並+1
            const maxSerialNumber = existingAccounts.reduce((max, acc) => {
                const match = acc.id.match(/^(\d+)_/);
                if (match) {
                    return Math.max(max, parseInt(match[1]));
                }
                return max;
            }, 0);
            
            const nextSerialNumber = (maxSerialNumber + 1).toString().padStart(3, '0');
            const newAccountId = `${nextSerialNumber}_${accountData.type}_${accountData.name}`;
            
            const newAccount = {
                id: newAccountId,
                ...accountData,
                currency: 'TWD',
                deleted: false,
                initialBalance: 0,
                createdAt: new Date().toISOString()
            };
            const updatedSettings: UserSettings = {
                ...settings,
                accounts: [...settings.accounts, newAccount]
            };
            
            // 驗證帳戶數量
            if (!userSettingsService.validateAccountCount(updatedSettings.accounts)) {
                console.warn('❌ 帳戶數量驗證失敗');
                return;
            }
            
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
            accounts: settings.accounts.map(acc => 
                acc.id === accountId 
                    ? { ...acc, deleted: true }
                    : acc
            )
        };

        await simpleDriveService.saveSettings(updatedSettings);
        setSettings(updatedSettings);
    };

    const handleRestoreAccount = async (accountId: string) => {
        if (!settings) return;

        const updatedSettings: UserSettings = {
            ...settings,
            accounts: settings.accounts.map(acc => 
                acc.id === accountId 
                    ? { ...acc, deleted: false }
                    : acc
            )
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

    // 過濾帳戶：根據 showDeletedAccounts 狀態決定是否顯示已刪除的帳戶
    const visibleAccounts = settings.accounts.filter(acc => 
        showDeletedAccounts ? true : !acc.deleted
    );

    // 檢查是否有已刪除的帳戶
    const hasDeletedAccounts = settings.accounts.some(acc => acc.deleted);

    return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-gray-300 font-bold text-lg">{t('account_settings.title', 'Accounts')}</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setIsEditMode(!isEditMode);
                            // 切換到檢視模式時自動隱藏已刪除帳戶
                            if (isEditMode) {
                                setShowDeletedAccounts(false);
                            }
                        }}
                        className="text-blue-400 font-bold text-sm bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition-colors"
                    >
                        {isEditMode ? t('account_settings.view_mode', '檢視模式') : t('account_settings.edit_account', '編輯帳戶')}
                    </button>
                    
                    {/* 新增帳戶按鈕 - 只有在檢視模式下顯示 */}
                    {!isEditMode && (
                        <button
                            onClick={handleAddAccount}
                            className="text-blue-400 font-bold text-sm bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition-colors"
                        >
                            {t('account_settings.add_account', '新增帳戶')}
                        </button>
                    )}
                    
                    {/* 復原帳戶按鈕 - 只有在編輯模式且有已刪除帳戶時才顯示 */}
                    {isEditMode && hasDeletedAccounts && (
                        <button
                            onClick={() => setShowDeletedAccounts(!showDeletedAccounts)}
                            className={`font-bold text-sm px-3 py-1.5 rounded-lg transition-colors ${
                                showDeletedAccounts 
                                    ? 'text-green-400 bg-green-500/10 hover:bg-green-500/20' 
                                    : 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
                            }`}
                        >
                            {showDeletedAccounts ? '🔄 隱藏已刪除' : '🔄 復原帳戶'}
                        </button>
                    )}
                </div>
            </div>

            {/* 已刪除帳戶提示 */}
            {showDeletedAccounts && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span>正在顯示已刪除的帳戶，點擊復原按鈕可以恢復帳戶</span>
                    </div>
                </div>
            )}

            {/* Account List */}
            <div className="space-y-3">
                {visibleAccounts.map(acc => (
                    <div 
                        key={acc.id} 
                        className={`flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border transition-all ${
                            dragOverAccountId === acc.id ? 'border-blue-400 bg-blue-900/20' : 'border-gray-800'
                        } ${isEditMode ? 'cursor-move' : ''} ${
                            acc.deleted ? 'opacity-50 bg-red-900/20 border-red-800/50' : ''
                        }`}
                        draggable={isEditMode && !acc.deleted}
                        onDragStart={() => !acc.deleted && handleDragStart(acc.id)}
                        onDragOver={(e) => !acc.deleted && handleDragOver(e, acc.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => !acc.deleted && handleDrop(e, acc.id)}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="flex items-center gap-3">
                            {isEditMode && (
                                <div className={`cursor-move ${acc.deleted ? 'text-red-400' : 'text-gray-400'}`}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </div>
                            )}
                            <div className={`
                                w-10 h-10 rounded-full flex items-center justify-center
                                ${acc.deleted ? 'bg-red-500/10 text-red-400' : 
                                  acc.type === 'cash' ? 'bg-green-500/10 text-green-400' : ''}
                                ${!acc.deleted && acc.type === 'bank' ? 'bg-blue-500/10 text-blue-400' : ''}
                                ${!acc.deleted && acc.type === 'credit' ? 'bg-purple-500/10 text-purple-400' : ''}
                                ${!acc.deleted && acc.type === 'ewallet' ? 'bg-orange-500/10 text-orange-400' : ''}
                                ${!acc.deleted && acc.type === 'securities' ? 'bg-cyan-500/10 text-cyan-400' : ''}
                                ${!acc.deleted && acc.type === 'exchange' ? 'bg-red-500/10 text-red-400' : ''}
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
                                <h4 className={`font-medium ${acc.deleted ? 'text-red-300 line-through' : 'text-white'}`}>
                                    {acc.name}
                                    {acc.deleted && <span className="ml-2 text-xs text-red-400">(已刪除)</span>}
                                </h4>
                                <p className={`text-xs capitalize ${acc.deleted ? 'text-red-500' : 'text-gray-500'}`}>
                                    {t(`transaction.accounts.${acc.type}`)}
                                    {acc.initialBalance !== undefined && acc.initialBalance !== 0 && (
                                        <span className="ml-2">
                                            初始: {acc.initialBalance.toLocaleString()} {acc.currency || 'TWD'}
                                        </span>
                                    )}
                                    {acc.createdAt && (
                                        <span className="ml-2">
                                            創建: {new Date(acc.createdAt).toLocaleDateString('zh-TW')}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isEditMode && (
                                <>
                                    {!acc.deleted ? (
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
                                    ) : (
                                        <button
                                            onClick={() => handleRestoreAccount(acc.id)}
                                            className="text-green-400 hover:text-green-300 p-1"
                                            title="復原帳戶"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                        </button>
                                    )}
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
