import React from 'react';

interface MobileLayoutProps {
    children: React.ReactNode;
    className?: string;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children, className = '' }) => {
    return (
        <div className="min-h-screen w-full bg-gray-950 flex justify-center overflow-x-hidden">
            {/* Mobile Container */}
            <div className={`w-full max-w-[480px] bg-gray-900 min-h-screen relative shadow-2xl overflow-y-auto ${className}`}>
                {children}
            </div>
        </div>
    );
};
