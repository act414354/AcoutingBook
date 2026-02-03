// 測試用戶設定系統
// 在瀏覽器控制台中運行此代碼來測試新的用戶設定系統

async function testUserSettings() {
    console.log('🧪 測試用戶設定系統...');
    
    try {
        // 導入 userSettingsService
        const { userSettingsService } = await import('./src/services/userSettingsService.ts');
        
        // 1. 初始化設定
        console.log('1️⃣ 初始化用戶設定...');
        const settings = await userSettingsService.initialize('test_user_123');
        console.log('✅ 初始化成功:', settings);
        
        // 2. 獲取設定
        console.log('2️⃣ 獲取當前設定...');
        const currentSettings = userSettingsService.getSettings();
        console.log('✅ 當前設定:', currentSettings);
        
        // 3. 更新設定
        console.log('3️⃣ 更新語言設定...');
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
        console.log('4️⃣ 測試分類管理...');
        await userSettingsService.updateSettings({
            categories: {
                expense: [
                    ...updatedSettings.categories.expense,
                    { id: 'test_category', name: 'Test Category', color: '#ff6b6b' }
                ]
            }
        });
        
        const finalSettings = userSettingsService.getSettings();
        console.log('✅ 最終設定:', finalSettings);
        
        console.log('🎉 所有測試通過！');
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
    }
}

// 運行測試
testUserSettings();
