import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export const InvestScreen = () => {
    const { t } = useTranslation();
    const [mode, setMode] = useState<'short' | 'long'>('short');

    return (
        <div className="space-y-6">
            {/* Mode Switcher */}
            <div className="bg-gray-800 p-1 rounded-xl flex">
                <button
                    onClick={() => setMode('short')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'short'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    {t('invest.tab_short')}
                </button>
                <button
                    onClick={() => setMode('long')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'long'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    {t('invest.tab_long')}
                </button>
            </div>

            {mode === 'short' ? (
                <div className="space-y-4">
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-gray-300 font-semibold mb-4">{t('invest.quick_trade')}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">{t('invest.symbol_label')}</label>
                                <input
                                    type="text"
                                    placeholder={t('invest.symbol_placeholder')}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">{t('invest.pl_label')}</label>
                                <input
                                    type="number"
                                    placeholder={t('invest.amount_placeholder')}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all">
                                {t('invest.record_btn')}
                            </button>
                        </div>
                    </div>

                    <div className="text-center text-gray-500 text-xs">
                        {t('invest.reflect_notice')}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Long-term Placeholder */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col items-center justify-center min-h-[300px]">
                        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <h3 className="text-gray-300 font-semibold">{t('invest.journal_title')}</h3>
                        <p className="text-gray-500 text-sm mt-2 text-center max-w-xs">
                            {t('invest.journal_desc')}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
