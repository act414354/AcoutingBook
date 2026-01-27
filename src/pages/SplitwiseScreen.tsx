import React from 'react';
import { useTranslation } from 'react-i18next';

export const SplitwiseScreen: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                <div>
                    <h2 className="text-xl font-bold text-white">{t('dashboard.splitwise', 'Group Sharing')}</h2>
                    <p className="text-sm text-gray-400">{t('splitwise.subtitle', 'Manage shared expenses')}</p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    {t('splitwise.new_group', '+ New Group')}
                </button>
            </div>

            {/* Empty State / Placeholder */}
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-4 relative">
                    <svg className="w-12 h-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div className="absolute top-0 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-gray-900"></div>
                </div>
                <h3 className="text-lg font-medium text-white">{t('splitwise.no_groups', 'No Shared Groups yet')}</h3>
                <p className="text-gray-500 max-w-xs">{t('splitwise.desc', 'Create a group to split bills with friends and family via Google Drive.')}</p>
            </div>

            {/* Mock Action */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 opacity-50 cursor-not-allowed">
                    <div className="text-gray-400 text-sm mb-1">{t('splitwise.you_owe', 'You owe')}</div>
                    <div className="text-2xl font-bold text-red-400">NT$ 0</div>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 opacity-50 cursor-not-allowed">
                    <div className="text-gray-400 text-sm mb-1">{t('splitwise.you_are_owed', 'You are owed')}</div>
                    <div className="text-2xl font-bold text-green-400">NT$ 0</div>
                </div>
            </div>
        </div>
    );
};
