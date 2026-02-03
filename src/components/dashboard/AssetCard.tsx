import React from 'react';
import { useTranslation } from 'react-i18next';

interface AssetCardProps {
    totalAssets: number;
    currency?: string;
    dayChange?: number;
    dayChangePercentage?: number;
}

export const AssetCard: React.FC<AssetCardProps> = ({
    totalAssets,
    currency = 'TWD',
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-700 relative overflow-hidden">
            {/* Decorative Blur */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>

            <p className="text-gray-400 text-sm font-medium mb-1 z-10 relative">{t('dashboard.total_net_worth')}</p>

            <div className="text-3xl font-bold text-white mb-4 z-10 relative">
                {totalAssets < 0 ? '-' : ''}
                {currency === 'TWD' ? 'NT$' : '$'}
                {Math.abs(totalAssets).toLocaleString()}
            </div>
        </div>
    );
};
