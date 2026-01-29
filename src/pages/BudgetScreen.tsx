import React from 'react';
import { useTranslation } from 'react-i18next';

export const BudgetScreen: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="h-[calc(100vh-200px)] w-full bg-gray-900 rounded-3xl overflow-hidden border border-gray-800 shadow-2xl relative flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-blue-500/10 p-4 rounded-full mb-4">
                <svg className="w-12 h-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{t('budget.title')}</h2>
            <p className="text-gray-400 max-w-sm">{t('budget.desc')}</p>
            <div className="mt-8 px-4 py-2 bg-blue-900/30 rounded-full border border-blue-500/30">
                <span className="text-xs text-blue-400 font-mono tracking-wider">{t('budget.flow_mode')}</span>
            </div>
        </div>
    );
};
