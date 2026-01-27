import React, { createContext, useContext, useEffect, useState } from 'react';
import { simpleDriveService } from '../services/simpleDrive';
import type { UserData, UserSettings, AccountingData } from '../services/simpleDrive';

interface SimpleAuthContextType {
    isAuthenticated: boolean;
    user: UserData | null;
    loading: boolean;
    login: () => Promise<void>;
    loginAsGuest: () => Promise<void>;
    logout: () => Promise<void>;
    error: string | null;
    accountingData: AccountingData | null;
    saveData: (data: AccountingData) => Promise<void>;
    syncData: () => Promise<void>;
    // New Dashboard Data
    // New Dashboard Data
    totalAssets: number;
    refreshData: () => Promise<void>;
    // Settings
    settings: UserSettings | null;
    updateSettings: (settings: UserSettings) => Promise<void>;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

export const SimpleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accountingData, setAccountingData] = useState<AccountingData | null>(null);
    const [totalAssets, setTotalAssets] = useState(0);
    const [settings, setSettings] = useState<UserSettings | null>(null);

    const refreshData = async () => {
        // Fetch new snapshot from blockchain service
        const snapshot = simpleDriveService.getCurrentSnapshot();
        setTotalAssets(snapshot.totalAssets);
    };

    useEffect(() => {
        const init = async () => {
            try {
                await simpleDriveService.initialize();

                // 檢查是否已經登入
                if (simpleDriveService.isSignedIn()) {
                    const userData = simpleDriveService.getUser();
                    if (userData) {
                        setUser(userData);
                        setIsAuthenticated(true);
                        await simpleDriveService.syncLatestBlock(); // Ensure blockchain state is synced
                        await loadAccountingData();
                        await loadSettings();
                        await refreshData(); // Load snapshot
                    }
                }
            } catch (err: any) {
                console.error("初始化失敗", err);
                setError(err.message || "初始化失敗");
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    const loadAccountingData = async () => {
        try {
            const data = await simpleDriveService.readAccountingData();
            setAccountingData(data);
        } catch (err: any) {
            console.error("載入資料失敗", err);
            // 如果是首次使用，資料檔案可能不存在，這是正常的
            if (!err.message.includes('資料檔案未初始化')) {
                setError(err.message || "載入資料失敗");
            }
        }
    };

    const loadSettings = async () => {
        try {
            const s = await simpleDriveService.getSettings();
            setSettings(s);
        } catch (e: any) {
            console.warn("Failed to load settings:", e);
        }
    };

    const login = async () => {
        try {
            setError(null);
            setLoading(true);

            const userData = await simpleDriveService.signIn();
            setUser(userData);
            setIsAuthenticated(true);

            // 登入成功後載入資料
            await loadAccountingData();
            await loadSettings();
            await refreshData();
        } catch (err: any) {
            console.error("登入失敗", err);
            setError(err.message || "登入失敗");
        } finally {
            setLoading(false);
        }
    };

    const loginAsGuest = async () => {
        try {
            setError(null);
            setLoading(true);
            const userData = await simpleDriveService.loginAsGuest();
            setUser(userData);
            setIsAuthenticated(true);
            await loadAccountingData();
            await loadSettings();
            await refreshData();
        } catch (err: any) {
            console.error("訪客登入失敗", err);
            setError("無法啟動訪客模式");
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await simpleDriveService.signOut();
            setUser(null);
            setIsAuthenticated(false);
            setAccountingData(null);
            setTotalAssets(0);
            setError(null);
        } catch (err: any) {
            console.error("登出失敗", err);
            setError(err.message || "登出失敗");
        }
    };

    const saveData = async (data: AccountingData) => {
        try {
            await simpleDriveService.saveAccountingData(data);
            setAccountingData(data);
        } catch (err: any) {
            console.error("儲存資料失敗", err);
            setError(err.message || "儲存資料失敗");
            throw err;
        }
    };

    const syncData = async () => {
        try {
            const data = await simpleDriveService.syncData();
            setAccountingData(data);
            await refreshData();
        } catch (err: any) {
            console.error("同步資料失敗", err);
            setError(err.message || "同步資料失敗");
            throw err;
        }
    };

    const updateSettings = async (newSettings: UserSettings) => {
        try {
            await simpleDriveService.saveSettings(newSettings);
            setSettings(newSettings);
        } catch (err: any) {
            console.error("Failed to save settings:", err);
            setError(err.message || "設定儲存失敗");
        }
    };

    return (
        <SimpleAuthContext.Provider value={{
            isAuthenticated,
            user,
            loading,
            login,
            loginAsGuest,
            logout,
            error,
            accountingData,
            saveData,
            syncData,
            totalAssets,
            refreshData,
            settings,
            updateSettings
        }}>
            {children}
        </SimpleAuthContext.Provider>
    );
}

export const useSimpleAuth = () => {
    const context = useContext(SimpleAuthContext);
    if (context === undefined) {
        throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
    }
    return context;
};
