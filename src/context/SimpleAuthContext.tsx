import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { simpleDriveService } from '../services/simpleDrive';
import { userSettingsService } from '../services/userSettingsService';
import { languageService } from '../services/languageService';
import type { UserData, AccountingData } from '../services/simpleDrive';
import type { UserSettings } from '../services/userSettingsService';

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
        try {
            console.log('🔄 開始刷新數據...');
            
            // 首先同步最新的區塊數據
            await simpleDriveService.syncLatestBlock();
            console.log('✅ 區塊數據同步完成');
            
            // Fetch new snapshot from blockchain service
            const snapshot = simpleDriveService.getCurrentSnapshot();
            
            // 調試：打印快照數據
            console.log('🔍 Debug - Current Snapshot:', JSON.stringify(snapshot, null, 2));
            console.log('🔍 Debug - Total Assets:', JSON.stringify(snapshot.totalAssets, null, 2));
        
        // Calculate total assets from all currencies
        const totalAssets = snapshot.totalAssets || {};
        const rates: Record<string, number> = {
            'TWD': 1,
            'USD': 30,
            'JPY': 0.22,
            'KRW': 0.025,
            'EUR': 33,
            'USDT': 30,
            'USDC': 30
        };
        
        let totalValue = 0;
        Object.entries(totalAssets).forEach(([currency, amount]) => {
            const rate = rates[currency] || 1;
            totalValue += amount * rate;
            console.log(`🔍 Debug - Currency: ${currency}, Amount: ${amount}, Rate: ${rate}, Value: ${amount * rate}`);
        });
        
        console.log('🔍 Debug - Final Total Value:', totalValue);
        console.log('🔍 Debug - Total Assets Keys Count:', Object.keys(totalAssets).length);
        
        // 如果沒有交易記錄但數值不為0，強制重置為0
        if (Object.keys(totalAssets).length === 0 && totalValue !== 0) {
            console.log('⚠️ 強制重置總資產為 0（沒有交易記錄）');
            totalValue = 0;
        }
        
        setTotalAssets(totalValue);
        } catch (error) {
            console.error('❌ 刷新數據失敗:', error);
        }
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
            console.log('📋 載入用戶設定到 Context...');
            const s = await userSettingsService.getSettings();
            if (s) {
                setSettings(s);
                console.log('✅ 設定已載入到 Context:', s);
            } else {
                console.warn('⚠️ 沒有找到用戶設定');
            }
        } catch (e: any) {
            console.warn("❌ 載入設定失敗:", e);
        }
    };

    const login = async () => {
        try {
            setError(null);
            setLoading(true);

            const userData = await simpleDriveService.signIn();
            setUser(userData);
            setIsAuthenticated(true);

            // 完整的 Google Drive 設定初始化流程
            console.log('🔧 開始完整的 Google Drive 設定初始化...');
            await initializeGoogleDriveSettings(userData.id);

            // 登入成功後載入資料
            await loadAccountingData();
            await refreshData();
        } catch (err: any) {
            console.error("登入失敗", err);
            setError(err.message || "登入失敗");
        } finally {
            setLoading(false);
        }
    };

    // 完整的 Google Drive 設定初始化流程
    const initializeGoogleDriveSettings = async (userId: string) => {
        console.log('🚀 開始 Google Drive 設定初始化流程...');
        
        try {
            // 1. 檢查 Google Drive 中是否有 QuickBook Data 資料夾
            console.log('📁 檢查 QuickBook Data 資料夾...');
            const folderResponse = await gapi.client.drive.files.list({
                q: "name='QuickBook Data' and mimeType='application/vnd.google-apps.folder' and trashed=false",
                fields: 'files(id, name)'
            });
            
            let folderId: string;
            let hasUserSetting = false;
            
            if (folderResponse.result.files && folderResponse.result.files.length > 0) {
                // 資料夾存在
                folderId = folderResponse.result.files[0].id!;
                console.log('✅ QuickBook Data 資料夾已存在:', folderId);
                
                // 2. 檢查資料夾中是否有 user_setting.json
                console.log('📄 檢查 user_setting.json...');
                const fileResponse = await gapi.client.drive.files.list({
                    q: `name='user_setting.json' and '${folderId}' in parents and trashed=false`,
                    fields: 'files(id, name, modifiedTime)'
                });
                
                if (fileResponse.result.files && fileResponse.result.files.length > 0) {
                    hasUserSetting = true;
                    console.log('✅ user_setting.json 已存在');
                    
                    // 3. 載入現有的 user_setting.json
                    console.log('📥 載入現有的 user_setting.json...');
                    const fileId = fileResponse.result.files[0].id!;
                    const downloadResponse = await gapi.client.drive.files.get({
                        fileId: fileId,
                        alt: 'media'
                    });
                    
                    const existingSettings = downloadResponse.result as UserSettings;
                    console.log('✅ 成功載入現有設定:', existingSettings);
                    
                    // 4. 使用 userSettingsService 設定載入的設定 (不自動保存，因為已經從 Drive 載入)
                    await userSettingsService.setSettings(existingSettings, false);
                    setSettings(existingSettings);
                    
                } else {
                    console.log('📄 user_setting.json 不存在，將使用 init_setting.json');
                }
            } else {
                // 資料夾不存在，需要創建
                console.log('📁 QuickBook Data 資料夾不存在，創建中...');
                const createResponse = await gapi.client.drive.files.create({
                    resource: {
                        name: 'QuickBook Data',
                        mimeType: 'application/vnd.google-apps.folder'
                    },
                    fields: 'id'
                });
                folderId = createResponse.result.id!;
                console.log('✅ QuickBook Data 資料夾創建成功:', folderId);
            }
            
            // 5. 如果沒有 user_setting.json，使用 init_setting.json
            if (!hasUserSetting) {
                console.log('🎨 使用 init_setting.json 創新新設定...');
                
                // 使用 userSettingsService 的 initialize 方法，它會自動使用 init_setting.json 但不自動保存
                const newSettings = await userSettingsService.initialize(userId, false);
                console.log('✅ 新設定創建成功:', newSettings);
                setSettings(newSettings);
                
                // 手動保存一次
                console.log('💾 手動保存新用戶設定到 Google Drive...');
                await userSettingsService.saveToDrive();
            }
            
            // 6. 確保設定已保存到 Google Drive
            //console.log('💾 確保設定已保存到 Google Drive...');
            //await userSettingsService.saveToDrive();
            
            console.log('🎉 Google Drive 設定初始化完成！');
            
        } catch (error) {
            console.error('❌ Google Drive 設定初始化失敗:', error);
            // 如果失敗，至少確保有基本設定
            try {
                const fallbackSettings = await userSettingsService.initialize(userId);
                setSettings(fallbackSettings);
            } catch (fallbackError) {
                console.error('❌ 後備設定初始化也失敗:', fallbackError);
            }
        }
    };

    const loginAsGuest = async () => {
        try {
            setError(null);
            setLoading(true);
            const userData = await simpleDriveService.loginAsGuest();
            setUser(userData);
            setIsAuthenticated(true);

            // 初始化訪客設定
            console.log('🔧 初始化訪客設定...');
            await userSettingsService.initialize('guest_user');

            await loadAccountingData();
            // 注意：不再需要調用 loadSettings()，因為 userSettingsService 已經處理了
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
            setSettings(null);
            setError(null);
            
            // 重置語言服務
            languageService.reset();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const saveData = async (data: AccountingData) => {
        try {
            await simpleDriveService.saveData(data);
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
            console.log('💾 更新設定到 Google Drive...');
            
            // 立即更新 Context 中的設定
            setSettings(newSettings);
            
            // 異步保存，不阻塞 UI
            Promise.resolve().then(async () => {
                await userSettingsService.setSettings(newSettings);
                console.log('✅ 設定更新成功');
            }).catch(error => {
                console.error('❌ 更新設定失敗:', error);
                setError(error.message || "更新設定失敗");
            });
            
        } catch (err: any) {
            console.error('❌ 更新設定失敗:', err);
            setError(err.message || "更新設定失敗");
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
