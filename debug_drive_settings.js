// 調試 Google Drive 設定問題
// 在瀏覽器控制台中運行此代碼來診斷問題

async function debugDriveSettings() {
    console.log('🔍 開始調試 Google Drive 設定問題...');
    
    try {
        // 1. 檢查 Google API 狀態
        console.log('1️⃣ 檢查 Google API 狀態...');
        if (!gapi.auth2) {
            console.error('❌ gapi.auth2 未初始化');
            return;
        }
        
        const authInstance = gapi.auth2.getAuthInstance();
        if (!authInstance) {
            console.error('❌ Google Auth 實例不存在');
            return;
        }
        
        const isSignedIn = authInstance.isSignedIn.get();
        console.log('🔐 登入狀態:', isSignedIn);
        
        if (!isSignedIn) {
            console.error('❌ 用戶未登入 Google');
            return;
        }
        
        const currentUser = authInstance.currentUser.get();
        const profile = currentUser.getBasicProfile();
        console.log('👤 當前用戶:', {
            id: profile.getId(),
            name: profile.getName(),
            email: profile.getEmail()
        });
        
        // 2. 檢查 Drive API 權限
        console.log('2️⃣ 檢查 Drive API 權限...');
        const grantedScopes = currentUser.getGrantedScopes();
        console.log('🔑 已授權範圍:', grantedScopes);
        
        const hasDriveScope = grantedScopes.includes('https://www.googleapis.com/auth/drive.file');
        console.log('📁 Drive 檔案權限:', hasDriveScope);
        
        if (!hasDriveScope) {
            console.error('❌ 缺少 Drive 檔案權限');
            return;
        }
        
        // 3. 測試 Drive API 連接
        console.log('3️⃣ 測試 Drive API 連接...');
        try {
            const response = await gapi.client.drive.files.list({
                pageSize: 10,
                fields: 'files(id, name, mimeType)'
            });
            console.log('✅ Drive API 連接成功');
            console.log('📁 用戶檔案列表:', response.result.files);
        } catch (error) {
            console.error('❌ Drive API 連接失敗:', error);
            return;
        }
        
        // 4. 檢查 QuickBook Data 資料夾
        console.log('4️⃣ 檢查 QuickBook Data 資料夾...');
        try {
            const folderResponse = await gapi.client.drive.files.list({
                q: "name='QuickBook Data' and mimeType='application/vnd.google-apps.folder' and trashed=false",
                fields: 'files(id, name, createdTime)'
            });
            
            const folders = folderResponse.result.files;
            if (folders && folders.length > 0) {
                console.log('✅ 找到 QuickBook Data 資料夾:', folders[0]);
            } else {
                console.log('📁 QuickBook Data 資料夾不存在，將會自動創建');
            }
        } catch (error) {
            console.error('❌ 檢查資料夾失敗:', error);
        }
        
        // 5. 檢查 user_setting.json 檔案
        console.log('5️⃣ 检查 user_setting.json 檔案...');
        try {
            const fileResponse = await gapi.client.drive.files.list({
                q: "name='user_setting.json' and trashed=false",
                fields: 'files(id, name, modifiedTime, size)'
            });
            
            const files = fileResponse.result.files;
            if (files && files.length > 0) {
                console.log('✅ 找到 user_setting.json 檔案:', files[0]);
                
                // 嘗試下載檔案內容
                try {
                    const downloadResponse = await gapi.client.drive.files.get({
                        fileId: files[0].id,
                        alt: 'media'
                    });
                    console.log('📄 檔案內容:', downloadResponse.result);
                } catch (downloadError) {
                    console.error('❌ 下載檔案內容失敗:', downloadError);
                }
            } else {
                console.log('📄 user_setting.json 檔案不存在');
            }
        } catch (error) {
            console.error('❌ 檢查檔案失敗:', error);
        }
        
        // 6. 測試 userSettingsService
        console.log('6️⃣ 測試 userSettingsService...');
        try {
            const { userSettingsService } = await import('./src/services/userSettingsService.ts');
            
            // 獲取當前用戶 ID
            const userId = profile.getId();
            console.log('👤 用戶 ID:', userId);
            
            // 初始化設定
            console.log('🔧 初始化用戶設定...');
            const settings = await userSettingsService.initialize(userId);
            console.log('✅ 初始化成功:', settings);
            
            // 測試更新
            console.log('🔄 測試更新設定...');
            await userSettingsService.updateSettings({
                preferences: {
                    language: settings.preferences.language === 'zh-TW' ? 'en' : 'zh-TW'
                }
            });
            
            const updatedSettings = userSettingsService.getSettings();
            console.log('✅ 更新成功:', updatedSettings);
            
        } catch (serviceError) {
            console.error('❌ userSettingsService 測試失敗:', serviceError);
        }
        
        console.log('🎉 調試完成！');
        
    } catch (error) {
        console.error('❌ 調試過程中發生錯誤:', error);
    }
}

// 手動創建測試檔案
async function createTestFile() {
    try {
        console.log('🆕 手動創建測試檔案...');
        
        const testSettings = {
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
            userId: gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile().getId(),
            preferences: {
                language: "zh-TW",
                theme: "dark",
                currency: {
                    default: "TWD",
                    displayCurrency: "TWD"
                },
                dateFormat: "YYYY-MM-DD",
                timeFormat: "24h",
                customCurrencies: ["TWD", "USD", "JPY"]
            },
            modules: {
                budget: true,
                splitwise: true,
                invest: true
            },
            homeWidgets: {
                assetCard: true,
                tPlusTwo: true,
                transactions: true
            },
            accounts: [],
            categories: {
                income: [
                    { id: "salary", name: "salary", color: "#10b981" }
                ],
                expense: [
                    { id: "food", name: "food", color: "#ef4444" }
                ]
            },
            ui: {
                compactMode: false,
                showAnimations: true,
                autoBackup: true
            }
        };
        
        // 創建檔案
        const response = await gapi.client.request({
            path: '/upload/drive/v3/files',
            method: 'POST',
            params: {
                uploadType: 'media',
                name: 'user_setting.json',
                parents: [await getAppFolderId()]
            },
            body: JSON.stringify(testSettings, null, 2)
        });
        
        console.log('✅ 測試檔案創建成功:', response.result);
        
    } catch (error) {
        console.error('❌ 創建測試檔案失敗:', error);
    }
}

async function getAppFolderId() {
    const response = await gapi.client.drive.files.list({
        q: "name='QuickBook Data' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name)'
    });

    const folders = response.result.files;
    if (folders && folders.length > 0) {
        return folders[0].id!;
    } else {
        // 創建資料夾
        const createResponse = await gapi.client.drive.files.create({
            resource: {
                name: 'QuickBook Data',
                mimeType: 'application/vnd.google-apps.folder'
            }
        });
        return createResponse.result.id!;
    }
}

// 運行調試
console.log('🚀 開始調試...');
debugDriveSettings();
