import React from 'react';

interface UnderDevelopmentAlertProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UnderDevelopmentAlert: React.FC<UnderDevelopmentAlertProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold">功能尚未開發</h3>
            <p className="text-gray-400 text-sm">此功能正在開發中</p>
          </div>
        </div>
        
        <p className="text-gray-300 text-sm mb-6">
          需要使用此功能請聯繫開發者，我們會為您提供相關協助。
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={() => {
              // 可以添加聯繫開發者的邏輯
              window.open('https://line.me/ti/p/@vb_dev', '_blank');
            }}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-xl transition-all text-sm"
          >
            聯繫開發者
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-xl transition-all text-sm"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};
