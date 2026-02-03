import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSimpleAuth } from '../../context/SimpleAuthContext';
import underDevelopmentData from '../../data/UnderDevelopment.json';
import { UnderDevelopmentAlert } from '../ui/UnderDevelopmentAlert';

export const ModuleSettings: React.FC = () => {
    const { t } = useTranslation();
    const { settings, updateSettings } = useSimpleAuth();
    const [savingModule, setSavingModule] = useState<string | null>(null);
    const [errorModule, setErrorModule] = useState<string | null>(null);
    const [showUnderDevelopmentAlert, setShowUnderDevelopmentAlert] = useState(false);

    if (!settings) return null;

    const toggleModule = async (moduleKey: keyof typeof settings.modules) => {
        // 檢查是否為開發中的模組
        if (underDevelopmentData.modules[moduleKey as keyof typeof underDevelopmentData.modules]) {
            setShowUnderDevelopmentAlert(true);
            return;
        }

        // 立即顯示切換效果（樂觀更新）
        const originalState = settings.modules[moduleKey];
        const newModules = {
            ...settings.modules,
            [moduleKey]: !originalState
        };
        
        const newSettings = {
            ...settings,
            modules: newModules
        };
        
        // 顯示保存狀態
        setSavingModule(moduleKey);
        setErrorModule(null);
        
        try {
            // 背景保存
            await updateSettings(newSettings);
            // 保存成功，不做任何動作（UI 已經是正確狀態）
        } catch (error) {
            console.error('保存模組設定失敗:', error);
            
            // 保存失敗，回滾到原來的狀態
            const rollbackSettings = {
                ...settings,
                modules: {
                    ...settings.modules,
                    [moduleKey]: originalState
                }
            };
            
            // 更新 Context 中的設定回滾
            try {
                await updateSettings(rollbackSettings);
            } catch (rollbackError) {
                console.error('回滾設定也失敗:', rollbackError);
            }
            
            // 顯示錯誤狀態
            setErrorModule(moduleKey);
            
            // 3秒後清除錯誤狀態
            setTimeout(() => setErrorModule(null), 3000);
        } finally {
            // 快速清除保存狀態 - 100ms
            setTimeout(() => setSavingModule(null), 100);
        }
    };

    const modules = [
        { id: 'budget', label: t('dashboard.budget', 'Budget'), desc: t('settings.budget_desc', 'Sankey flows'), color: 'purple', iconPath: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z' },
        { id: 'splitwise', label: t('dashboard.splitwise', 'Splitwise'), desc: t('settings.splitwise_desc', 'Shared Expenses'), color: 'green', iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.025 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
        { id: 'family', label: t('dashboard.family', 'Family'), desc: t('settings.family_desc', 'Household Expenses'), color: 'pink', iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        { id: 'fund', label: t('dashboard.fund', 'Fund'), desc: t('settings.fund_desc', 'Mutual Funds'), color: 'indigo', iconPath: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
        { id: 'futures', label: t('dashboard.futures', 'Futures'), desc: t('settings.futures_desc', 'Futures Trading'), color: 'red', iconPath: 'M13 10V3L4 14h7v7l9-11h-7z' },
        { id: 'tw_stock', label: t('dashboard.tw_stock', 'TW Stock'), desc: t('settings.tw_stock_desc', 'Taiwan Stocks'), color: 'blue', iconPath: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
        { id: 'us_stock', label: t('dashboard.us_stock', 'US Stock'), desc: t('settings.us_stock_desc', 'US Market'), color: 'cyan', iconPath: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064' },
        { id: 'crypto', label: t('dashboard.crypto', 'Crypto'), desc: t('settings.crypto_desc', 'BTC/ETH/Altcoins'), color: 'yellow', iconPath: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        { id: 'metal', label: t('dashboard.metal', 'Metal'), desc: t('settings.metal_desc', 'Gold/Silver'), color: 'orange', iconPath: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
        { id: 'real_estate', label: t('dashboard.real_estate', 'Real Estate'), desc: t('settings.real_estate_desc', 'Property Assets'), color: 'teal', iconPath: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    ];

    return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-gray-300 font-semibold mb-4">{t('settings.modules', 'Modules (Beta)')}</h3>

            <div className="space-y-4">
                {modules.map((mod) => {
                    const isUnderDevelopment = underDevelopmentData.modules[mod.id as keyof typeof underDevelopmentData.modules];
                    
                    return (
                        <div key={mod.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 bg-${mod.color}-500/10 rounded-lg text-${mod.color}-400`}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mod.iconPath} />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-white text-sm font-medium flex items-center gap-2">
                                        {mod.label}
                                        {isUnderDevelopment && (
                                            <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 text-[10px] rounded-full border border-yellow-500/20">
                                                開發中
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-gray-500 text-xs">{mod.desc}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {errorModule === mod.id && (
                                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" title="保存失敗" />
                                )}
                                <button
                                    // @ts-ignore
                                    onClick={() => toggleModule(mod.id)}
                                    // @ts-ignore
                                    className={`w-12 h-6 rounded-full transition-colors duration-300 relative ${
                                        isUnderDevelopment 
                                            ? 'bg-gray-600 cursor-not-allowed opacity-50'
                                            : savingModule === mod.id 
                                                ? (settings.modules[mod.id] 
                                                    ? 'bg-blue-500/50'
                                                    : 'bg-gray-500/50')
                                                : (errorModule === mod.id 
                                                    ? 'bg-red-500'
                                                    : (settings.modules[mod.id] 
                                                        ? 'bg-blue-500' 
                                                        : 'bg-gray-600'))
                                    }`}
                                    disabled={savingModule !== null || isUnderDevelopment}
                                    title={isUnderDevelopment ? '功能尚未開發, 需使用請聯繫開發者' : undefined}
                                >
                                    {/* @ts-ignore */}
                                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                                        settings.modules[mod.id] ? 'translate-x-6' : ''
                                    } ${
                                        errorModule === mod.id ? 'animate-pulse' : ''
                                    }`} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* 錯誤提示 */}
            {errorModule && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>保存設定失敗，請檢查網路連線後重試</span>
                    </div>
                </div>
            )}
            
            <UnderDevelopmentAlert
                isOpen={showUnderDevelopmentAlert}
                onClose={() => setShowUnderDevelopmentAlert(false)}
            />
        </div>
    );
};
