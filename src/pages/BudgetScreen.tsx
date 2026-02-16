import React, { useState } from 'react';

interface BudgetCategory {
    id: string;
    name: string;
    budgeted: number;
    spent: number;
    icon: string;
    color: string;
}

export const BudgetScreen: React.FC = () => {
    const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'week' | 'year'>('month');
    const [showAddBudget, setShowAddBudget] = useState(false);

    // 模擬預算數據 - 實際應從用戶設定中讀取
    const budgetCategories: BudgetCategory[] = [
        {
            id: 'food',
            name: '餐飲',
            budgeted: 8000,
            spent: 5200,
            icon: '🍽️',
            color: 'bg-orange-500'
        },
        {
            id: 'transport',
            name: '交通',
            budgeted: 3000,
            spent: 1800,
            icon: '🚗',
            color: 'bg-blue-500'
        },
        {
            id: 'shopping',
            name: '購物',
            budgeted: 5000,
            spent: 6200,
            icon: '🛍️',
            color: 'bg-pink-500'
        },
        {
            id: 'entertainment',
            name: '娛樂',
            budgeted: 2000,
            spent: 800,
            icon: '🎮',
            color: 'bg-purple-500'
        },
        {
            id: 'utilities',
            name: '水電費',
            budgeted: 4000,
            spent: 3500,
            icon: '💡',
            color: 'bg-yellow-500'
        }
    ];

    const totalBudgeted = budgetCategories.reduce((sum, cat) => sum + cat.budgeted, 0);
    const totalSpent = budgetCategories.reduce((sum, cat) => sum + cat.spent, 0);
    const remainingBudget = totalBudgeted - totalSpent;

    const getProgressColor = (spent: number, budgeted: number) => {
        const percentage = (spent / budgeted) * 100;
        if (percentage >= 100) return 'bg-red-500';
        if (percentage >= 80) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getProgressPercentage = (spent: number, budgeted: number) => {
        return Math.min((spent / budgeted) * 100, 100);
    };

    return (
        <div className="p-6 space-y-6">
            {/* 預算總覽卡片 */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-bold mb-1">預算總覽</h2>
                        <p className="text-blue-100 text-sm">本月預算使用情況</p>
                    </div>
                    <div className="flex gap-2">
                        {(['month', 'week', 'year'] as const).map((period) => (
                            <button
                                key={period}
                                onClick={() => setSelectedPeriod(period)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                                    selectedPeriod === period
                                        ? 'bg-white/20 text-white'
                                        : 'bg-white/10 text-blue-100 hover:bg-white/15'
                                }`}
                            >
                                {period === 'month' ? '月度' : period === 'week' ? '週度' : '年度'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/10 rounded-xl p-4">
                        <p className="text-blue-100 text-sm mb-1">總預算</p>
                        <p className="text-2xl font-bold">${totalBudgeted.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4">
                        <p className="text-blue-100 text-sm mb-1">已使用</p>
                        <p className="text-2xl font-bold">${totalSpent.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4">
                        <p className="text-blue-100 text-sm mb-1">剩餘</p>
                        <p className={`text-2xl font-bold ${remainingBudget < 0 ? 'text-red-200' : 'text-green-200'}`}>
                            ${Math.abs(remainingBudget).toLocaleString()}
                            {remainingBudget < 0 && ' 超支'}
                        </p>
                    </div>
                </div>

                {/* 總體進度條 */}
                <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2">
                        <span>使用率</span>
                        <span>{Math.round((totalSpent / totalBudgeted) * 100)}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-500 ${getProgressColor(totalSpent, totalBudgeted)}`}
                            style={{ width: `${Math.min((totalSpent / totalBudgeted) * 100, 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* 分類預算列表 */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">分類預算</h3>
                    <button
                        onClick={() => setShowAddBudget(!showAddBudget)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        新增預算
                    </button>
                </div>

                <div className="grid gap-4">
                    {budgetCategories.map((category) => {
                        const progressPercentage = getProgressPercentage(category.spent, category.budgeted);
                        const isOverBudget = category.spent > category.budgeted;
                        const remaining = category.budgeted - category.spent;

                        return (
                            <div key={category.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 ${category.color} rounded-lg flex items-center justify-center text-lg`}>
                                            {category.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-white">{category.name}</h4>
                                            <p className="text-sm text-gray-400">
                                                ${category.spent.toLocaleString()} / ${category.budgeted.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-semibold ${isOverBudget ? 'text-red-400' : 'text-green-400'}`}>
                                            {isOverBudget ? `超支 $${Math.abs(remaining).toLocaleString()}` : `剩餘 $${remaining.toLocaleString()}`}
                                        </p>
                                        <p className="text-xs text-gray-400">{Math.round(progressPercentage)}%</p>
                                    </div>
                                </div>

                                {/* 進度條 */}
                                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-500 ${getProgressColor(category.spent, category.budgeted)}`}
                                        style={{ width: `${progressPercentage}%` }}
                                    />
                                </div>

                                {/* 快速操作 */}
                                <div className="flex gap-2 mt-3">
                                    <button className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-lg transition-colors">
                                        編輯
                                    </button>
                                    <button className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-lg transition-colors">
                                        查看詳情
                                    </button>
                                    {isOverBudget && (
                                        <button className="text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-1 rounded-lg transition-colors">
                                            超支提醒
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 新增預算表單 */}
            {showAddBudget && (
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-4">新增預算分類</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">分類名稱</label>
                            <input
                                type="text"
                                placeholder="例如：餐飲、交通..."
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">預算金額</label>
                            <input
                                type="number"
                                placeholder="0"
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors">
                                儲存
                            </button>
                            <button 
                                onClick={() => setShowAddBudget(false)}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
