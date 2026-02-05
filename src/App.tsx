import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n'; // Import i18n config
import { SimpleAuthProvider, useSimpleAuth } from './context/SimpleAuthContext';
import { languageService } from './services/languageService';
import { MobileLayout } from './components/layout/MobileLayout';
import { BottomNav } from './components/layout/BottomNav';
import { AssetCard } from './components/dashboard/AssetCard';
import { TPlusTwoWidget } from './components/dashboard/TPlusTwoWidget';
import { InvestScreen } from './pages/InvestScreen';
import { BudgetScreen } from './pages/BudgetScreen';
import { TransactionModal } from './components/transaction/TransactionModal';
import { TransactionList } from './components/transaction/TransactionList';
import { LanguageSwitcher } from './components/settings/LanguageSwitcher';
import { CategorySettings } from './components/settings/CategorySettings';
import { ModuleSettings } from './components/settings/ModuleSettings';
import { HomeWidgetSettings } from './components/settings/HomeWidgetSettings';
import { SplitwiseScreen } from './pages/SplitwiseScreen';
import { RecordScreen } from './pages/RecordScreen';
import { AccountsScreen } from './pages/AccountsScreen'; // Import
import { AccountSettings } from './components/settings/AccountSettings'; // Import
import { CurrencySettings } from './components/settings/CurrencySettings'; // Import
import { AccountBalanceCard } from './components/dashboard/AccountBalanceCard'; // Import
import underDevelopmentData from './data/UnderDevelopment.json'; // Import under development data
import { UnderDevelopmentAlert } from './components/ui/UnderDevelopmentAlert'; // Import custom alert
import './index.css';

const Dashboard = () => {
  const { t } = useTranslation();
  const {
    isAuthenticated,
    login,
    loginAsGuest,
    logout,
    user,
    loading,
    error,
    totalAssets, // Actual Data from Context
    refreshData,
    settings
  } = useSimpleAuth();

  const [activeTab, setActiveTab] = useState('home');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showUnderDevelopmentAlert, setShowUnderDevelopmentAlert] = useState(false);

  // 初始化語言服務
  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        await languageService.initialize();
      } catch (error) {
        console.error('語言服務初始化失敗:', error);
      }
    };

    initializeLanguage();
  }, [isAuthenticated]);

  // 監聽導航變化，關閉所有模態框
  useEffect(() => {
    setShowTransactionModal(false);
    setEditingTransaction(null);
    setShowUnderDevelopmentAlert(false);
  }, [activeTab]); // 當認證狀態改變時重新初始化

  // 登入後自動顯示記錄頁面並開啟交易模態框
  useEffect(() => {
    if (isAuthenticated && !loading) {
      // 設置活動標籤為記錄頁面
      setActiveTab('record');
      // 延遲一點時間再開啟模態框，確保頁面已經渲染
      setTimeout(() => {
        setShowTransactionModal(true);
      }, 500);
    }
  }, [isAuthenticated, loading]);

  const handleTabChange = (id: string) => {
    // 檢查是否為開發中的模組
    if (underDevelopmentData.modules[id as keyof typeof underDevelopmentData.modules]) {
      setShowUnderDevelopmentAlert(true);
      return;
    }
    
    setActiveTab(id);
  };

  const handleEditTransaction = (tx: any) => {
    setEditingTransaction(tx);
    setShowTransactionModal(true);
  };

  const handleSuccess = async () => {
    await refreshData();
    setRefreshTrigger(prev => prev + 1);
    console.log("Transaction saved and dashboard updated!");
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-black text-blue-500">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-blue-500/30"></div>
        <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-t-2 border-blue-500 animate-spin"></div>
      </div>
    </div>
  );

  if (!isAuthenticated || !user) {
    return (
      <MobileLayout className="relative flex flex-col items-center justify-center p-6 bg-black overflow-hidden h-screen">
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] animate-float"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-500/20 rounded-full blur-[80px] animate-float-delayed"></div>

        <div className="w-full max-w-sm z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl mb-6 shadow-2xl shadow-blue-500/30 animate-float">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-5xl font-bold text-white tracking-tight mb-2">
              Quick<span className="text-blue-400">Book</span>
            </h1>
            <p className="text-gray-400 text-base tracking-wide font-light">
              {t('app.subtitle')}
            </p>
          </div>

          <div className="glass-card p-8 rounded-3xl backdrop-blur-xl border border-white/10 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-white mb-2">{t('app.welcome_back')}</h2>
              <p className="text-sm text-gray-400">{t('app.sign_in_desc')}</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <button
              onClick={login}
              className="group w-full bg-white text-gray-900 font-bold py-4 px-6 rounded-xl flex items-center justify-center transition-all duration-300 hover:bg-gray-100 hover:scale-[1.02] active:scale-95 shadow-lg shadow-white/10 mb-4"
            >
              <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
              </svg>
              {t('app.sign_in_google')}
            </button>

            <button
              onClick={loginAsGuest}
              className="w-full border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 hover:bg-white/5"
            >
              {t('app.try_demo')} <span className="text-xs ml-1 opacity-70">{t('app.demo_mode_desc')}</span>
            </button>
          </div>

          {/* 版本資訊顯示 */}
          <p className="mt-8 text-center text-xs text-gray-600 font-medium">
            {/* {t('app.version')} */}
            {/* 額外的版本資訊 */}
            {t("v1.10F.730203 • Make by Value Build • Secured by Google Drive")}
          </p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout className="pb-24">
      {/* Header */}
      <div className="bg-gray-900/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white">{t(`dashboard.${activeTab === 'home' ? 'title' : activeTab}`)}</h2>
          <p className="text-xs text-gray-400">{t('dashboard.welcome')}, {user?.name?.split(' ')[0]}</p>
        </div>
        <img
          src={user?.imageUrl || ''}
          alt="Profile"
          className="w-8 h-8 rounded-full border border-gray-700"
        />
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {activeTab === 'home' && (
          <>
            {/* 1. Asset Card */}
            {settings?.homeWidgets?.assetCard !== false && (
              <AssetCard
                totalAssets={totalAssets}
                dayChange={+15400}
                dayChangePercentage={1.25}
              />
            )}

            {/* 1.5 Account Balances */}
            <AccountBalanceCard />

            {/* 1.5 T+2 Widget */}
            {settings?.homeWidgets?.tPlusTwo !== false && (
              <TPlusTwoWidget
                pendingSettlements={[]}
              />
            )}

            {/* 3. Transaction History */}
            {settings?.homeWidgets?.transactions !== false && (
              <div className="mt-4">
                <TransactionList
                  onEdit={handleEditTransaction}
                  lastRefresh={refreshTrigger}
                />
              </div>
            )}
          </>
        )}

        {activeTab === 'record' && (
          <RecordScreen
            onSuccess={handleSuccess}
            onEdit={handleEditTransaction}
            lastRefresh={refreshTrigger}
            showTransactionModal={showTransactionModal}
            onOpenTransactionModal={() => setShowTransactionModal(true)}
            onCloseTransactionModal={() => setShowTransactionModal(false)}
          />
        )}

        {activeTab === 'accounts' && <AccountsScreen lastRefresh={refreshTrigger} onNavigateToSettings={() => setActiveTab('settings')} />}

        {activeTab === 'invest' && <InvestScreen />}

        {activeTab === 'budget' && <BudgetScreen />}

        {activeTab === 'budget' && <BudgetScreen />}

        {activeTab === 'splitwise' && <SplitwiseScreen />}

        {/* Asset Modules - Using InvestScreen as placeholder for now */}
        {['family', 'fund', 'futures', 'tw_stock', 'us_stock', 'crypto', 'metal', 'real_estate'].includes(activeTab) && (
          <InvestScreen />
          // TODO: Pass props to customize InvestScreen title based on activeTab
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* User Profile Section */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex items-center space-x-4">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="Profile" className="w-16 h-16 rounded-full border-2 border-blue-500" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xl">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
              <div>
                <h3 className="text-white font-bold text-lg">{user?.name}</h3>
                <p className="text-gray-400 text-sm">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] bg-green-500/10 text-green-400 border border-green-500/20">
                  {t('app.pro_user')}
                </span>
              </div>
            </div>

            <AccountSettings />

            <ModuleSettings />

            <CurrencySettings />

            <HomeWidgetSettings />

            <CategorySettings />

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-gray-300 font-semibold mb-4">{t('settings.language')}</h3>
              <LanguageSwitcher />
            </div>

            {/* Line@ and Community Buttons */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-gray-300 font-semibold mb-4">社群連結</h3>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="https://line.me/ti/p/@vb_dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3.5 5.5C3.5 4.12 4.62 3 6 3h12c1.38 0 2.5 1.12 2.5 2.5v13c0 1.38-1.12 2.5-2.5 2.5H6c-1.38 0-2.5-1.12-2.5-2.5v-13zm7.5 3c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm3 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm-3 3c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm3 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/>
                  </svg>
                  官方 Line
                </a>
                <a
                  href="https://line.me/ti/g2/1s3Hj1BuGJWcthRgUcj3fDg4xTc1tVg9wvU0_Q?utm_source=invitation&utm_medium=link_copy&utm_campaign=default"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  加入社群
                </a>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-8"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {t('common.logout', 'Sign Out')}
            </button>
            <div className="h-4"></div>
          </div>
        )}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        initialData={editingTransaction}
        onSuccess={handleSuccess}
      />

      <UnderDevelopmentAlert
        isOpen={showUnderDevelopmentAlert}
        onClose={() => setShowUnderDevelopmentAlert(false)}
      />
    </MobileLayout>
  );
};

function App() {
  return (
    <SimpleAuthProvider>
      <Dashboard />
    </SimpleAuthProvider>
  );
}

export default App;
