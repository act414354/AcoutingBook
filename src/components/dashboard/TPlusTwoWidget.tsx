import React from 'react';
import { useTranslation } from 'react-i18next';

interface SettlementItem {
    date: string; // YYYY-MM-DD
    amount: number;
    description: string;
}

interface TPlusTwoWidgetProps {
    pendingSettlements: SettlementItem[];
}

export const TPlusTwoWidget: React.FC<TPlusTwoWidgetProps> = ({ pendingSettlements }) => {
    const { t } = useTranslation();
    const totalPending = pendingSettlements.reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 mt-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-semibold flex items-center">
                    <span className="w-1.5 h-5 bg-yellow-500 rounded mr-3"></span>
                    {t('dashboard.t_plus_two')}
                </h3>
                <span className="text-gray-400 text-xs">{t('dashboard.settlement_status')}</span>
            </div>

            {pendingSettlements.length === 0 ? (
                <div className="space-y-3">
                    <p className="text-gray-500 text-sm text-center py-4">{t('dashboard.no_pending')}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-between items-end border-b border-gray-700 pb-2">
                        <span className="text-gray-400 text-sm">{t('dashboard.total_in_flight')}</span>
                        <span className="text-xl font-bold text-yellow-500">
                            NT$ {totalPending.toLocaleString()}
                        </span>
                    </div>

                    <div className="space-y-3">
                        {pendingSettlements.map((item, index) => (
                            <div key={index} className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500">{item.date}</span>
                                    <span className="text-sm text-gray-300">{item.description}</span>
                                </div>
                                <div className={`text-sm font-medium ${item.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
