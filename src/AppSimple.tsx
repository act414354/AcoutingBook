import { useState } from 'react';
import { SimpleAuthProvider, useSimpleAuth } from './context/SimpleAuthContext';
import { MobileLayout } from './components/layout/MobileLayout';
import { BottomNav } from './components/layout/BottomNavSimple';
import './index.css';

const Dashboard = () => {
  const { isAuthenticated, login, logout, user, loading, error } = useSimpleAuth();
  const [activeTab, setActiveTab] = useState('home');

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-900 text-blue-500">
      <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  );

  if (!isAuthenticated || !user) {
    return (
      <MobileLayout className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-900 to-gray-950">
        <div className="w-full max-w-sm">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">QuickBook</h1>
            <p className="text-gray-400 mt-2 text-sm tracking-wide">Decentralized Accounting</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-gray-700/50">
            <p className="text-gray-300 mb-8 text-center leading-relaxed">
              Secure, private, and serverless. Your data lives in your Google Drive.
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg mb-6 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={login}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center transition-all duration-200 shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
              </svg>
              Sign In with Google
            </button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Render different content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="p-6 space-y-6">
            {/* Placeholder for Assets Card */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <p className="text-gray-400 text-sm font-medium mb-1">Total Net Worth</p>
              <div className="text-3xl font-bold text-white mb-4">$0.00</div>
              <div className="flex gap-2">
                <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                  +0.00%
                </div>
              </div>
            </div>

            {/* Placeholder for T+2 Widget */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <span className="w-2 h-6 bg-yellow-500 rounded mr-3"></span>
                T+2 Pending
              </h3>
              <div className="space-y-3">
                <p className="text-gray-500 text-sm text-center py-4">No pending settlements</p>
              </div>
            </div>
          </div>
        );

      case 'budget':
        return (
          <div className="p-6">
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">Budget</h2>
              <p className="text-gray-400">Budget management features coming soon...</p>
            </div>
          </div>
        );

      case 'record':
        return (
          <div className="p-6">
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">Record Transaction</h2>
              <p className="text-gray-400">Transaction recording features coming soon...</p>
            </div>
          </div>
        );

      case 'accounts':
        return (
          <div className="p-6">
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">Accounts</h2>
              <p className="text-gray-400">Account management features coming soon...</p>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="p-6">
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">Settings</h2>
              <p className="text-gray-400">Settings features coming soon...</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <MobileLayout className="pb-24">
      {/* Header */}
      <div className="bg-gray-900/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white capitalize">{activeTab}</h2>
          <p className="text-xs text-gray-400">Welcome, {user?.name?.split(' ')[0]}</p>
        </div>
        <img
          src={user?.imageUrl || ''}
          alt="Profile"
          className="w-8 h-8 rounded-full border border-gray-700"
          onClick={logout}
        />
      </div>

      {/* Dynamic Content */}
      {renderContent()}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
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
