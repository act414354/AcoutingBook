// 測試 Google Drive 用戶設定系統
// 在瀏覽器控制台中運行此代碼來測試新的 Google Drive 設定系統

async function testDriveSettings() {
    console.log('🧪 測試 Google Drive 用戶設定系統...');
    
    try {
        // 檢查 gapi 是否已初始化
        if (!gapi.auth2.getAuthInstance()) {
            console.error('❌ Google API 未初始化，請先登入');
            return;
        }
        
        // 導入 userSettingsService
        const { userSettingsService } = await import('./src/services/userSettingsService.ts');
        
        // 1. 初始化設定
        console.log('1️⃣ 從 Google Drive 初始化用戶設定...');
        const settings = await userSettingsService.initialize('test_user_drive_123');
        console.log('✅ 初始化成功:', settings);
        
        // 2. 獲取設定
        console.log('2️⃣ 獲取當前設定...');
        const currentSettings = userSettingsService.getSettings();
        console.log('✅ 當前設定:', currentSettings);
        
        // 3. 更新語言設定
        console.log('3️⃣ 更新語言設定並同步到 Google Drive...');
        await userSettingsService.updateSettings({
            preferences: {
                language: 'en',
                currency: {
                    default: 'USD',
                    displayCurrency: 'USD'
                }
            }
        });
        
        const updatedSettings = userSettingsService.getSettings();
        console.log('✅ 更新後的設定:', updatedSettings);
        
        // 4. 測試分類管理
        console.log('4️⃣ 測試分類管理並同步到 Google Drive...');
        await userSettingsService.updateSettings({
            categories: {
                expense: [
                    ...updatedSettings.categories.expense,
                    { id: 'drive_test_category', name: 'Drive Test Category', color: '#9333ea' }
                ]
            }
        });
        
        const finalSettings = userSettingsService.getSettings();
        console.log('✅ 最終設定:', finalSettings);
        
        // 5. 測試重新載入
        console.log('5️⃣ 測試從 Google Drive 重新載入...');
        await userSettingsService.clear();
        const reloadedSettings = await userSettingsService.initialize('test_user_drive_123');
        console.log('✅ 重新載入的設定:', reloadedSettings);
        
        console.log('🎉 所有 Google Drive 設定測試通過！');
        console.log('📁 請檢查你的 Google Drive "QuickBook Data" 資料夾中的 user_setting.json 檔案');
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
    }
}

// 檢查 Google Drive 檔案
async function checkDriveFile() {
    try {
        const response = await gapi.client.drive.files.list({
            q: "name='user_setting.json' and trashed=false",
            fields: 'files(id, name, modifiedTime, size)'
        });
        
        const files = response.result.files;
        if (files && files.length > 0) {
            console.log('📁 Google Drive 中的 user_setting.json 檔案:');
            files.forEach(file => {
                console.log(`- 名稱: ${file.name}`);
                console.log(`- ID: ${file.id}`);
                console.log(`- 修改時間: ${file.modifiedTime}`);
                console.log(`- 大小: ${file.size} bytes`);
            });
        } else {
            console.log('📁 Google Drive 中沒有找到 user_setting.json 檔案');
        }
    } catch (error) {
        console.error('❌ 檢查 Drive 檔案失敗:', error);
    }
}

// 運行測試
console.log('🚀 開始測試 Google Drive 設定系統...');
testDriveSettings().then(() => {
    console.log('🔍 檢查 Google Drive 檔案狀態...');
    return checkDriveFile();
});
