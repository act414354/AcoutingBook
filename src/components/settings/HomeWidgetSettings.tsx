import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSimpleAuth } from '../../context/SimpleAuthContext';

export const HomeWidgetSettings: React.FC = () => {
    const { t } = useTranslation();
    const { settings, updateSettings } = useSimpleAuth();

    if (!settings || !settings.homeWidgets) return null;

    const toggleWidget = (widgetKey: keyof typeof settings.homeWidgets) => {
        const newWidgets = {
            ...settings.homeWidgets,
            [widgetKey]: !settings.homeWidgets[widgetKey]
        };
        updateSettings({
            ...settings,
            homeWidgets: newWidgets
        });
    };

    const widgets = [
        { id: 'asset_card', label: t('settings.widget_asset_card', 'Total Asset Card'), icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        { id: 't_plus_two', label: t('settings.widget_t_plus_two', 'T+2 Widget'), icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
        { id: 'transactions', label: t('settings.widget_transactions', 'Recent Transactions'), icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    ];

    return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-gray-300 font-semibold mb-4">{t('settings.home_widgets', 'Home Widgets')}</h3>

            <div className="space-y-4">
                {widgets.map((widget) => (
                    <div key={widget.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-700/50 rounded-lg text-gray-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={widget.icon} />
                                </svg>
                            </div>
                            <div className="text-white text-sm font-medium">{widget.label}</div>
                        </div>
                        <button
                            // @ts-ignore
                            onClick={() => toggleWidget(widget.id)}
                            // @ts-ignore
                            className={`w-12 h-6 rounded-full transition-colors duration-300 relative ${settings.homeWidgets[widget.id] ? 'bg-blue-500' : 'bg-gray-600'}`}
                        >
                            {/* @ts-ignore */}
                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${settings.homeWidgets[widget.id] ? 'translate-x-6' : ''}`} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
