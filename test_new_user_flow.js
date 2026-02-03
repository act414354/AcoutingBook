// 測試新用戶設定流程
// 在瀏覽器控制台中運行此代碼來測試新用戶的自動設定創建

async function testNewUserFlow() {
    console.log('🧪 測試新用戶設定流程...');
    
    try {
        // 檢查 Google API 狀態
        if (!gapi.auth2 || !gapi.auth2.getAuthInstance()) {
            console.error('❌ Google API 未初始化，請先登入');
            return;
        }
        
        const isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
        if (!isSignedIn) {
            console.error('❌ 用戶未登入 Google');
            return;
        }
        
        // 導入 userSettingsService
        const { userSettingsService } = await import('./src/services/userSettingsService.ts');
        
        // 獲取當前用戶 ID
        const currentUser = gapi.auth2.getAuthInstance().currentUser.get();
        const userId = currentUser.getBasicProfile().getId();
        
        console.log('👤 當前用戶 ID:', userId);
        
        // 1. 檢查是否已有設定檔案
        console.log('1️⃣ 檢查 Google Drive 中的現有設定...');
        const response = await gapi.client.drive.files.list({
            q: "name='user_setting.json' and trashed=false",
            fields: 'files(id, name, modifiedTime, size)'
        });
        
        const existingFiles = response.result.files;
        if (existingFiles && existingFiles.length > 0) {
            console.log('📁 找到現有設定檔案:', existingFiles[0]);
            
            // 備份現有檔案（可選）
            console.log('💾 備份現有設定檔案...');
            const downloadResponse = await gapi.client.drive.files.get({
                fileId: existingFiles[0].id,
                alt: 'media'
            });
            const backupSettings = downloadResponse.result;
            console.log('📄 備份內容:', backupSettings);
            
            // 刪除現有檔案來模擬新用戶
            console.log('🗑️ 刪除現有檔案來模擬新用戶...');
            await gapi.client.drive.files.delete({
                fileId: existingFiles[0].id
            });
            console.log('✅ 現有檔案已刪除');
        } else {
            console.log('📄 沒有找到現有設定檔案，這就是新用戶場景');
        }
        
        // 2. 測試新用戶初始化
        console.log('2️⃣ 測試新用戶初始化...');
        const settings = await userSettingsService.initialize(userId);
        console.log('✅ 新用戶設定初始化完成:', settings);
        
        // 3. 驗證設定內容
        console.log('3️⃣ 驗證設定內容...');
        console.log('🌐 語言設定:', settings.preferences.language);
        console.log('💰 貨幣設定:', settings.preferences.currency);
        console.log('📊 模組設定:', settings.modules);
        console.log('🏠 首頁小工具:', settings.homeWidgets);
        console.log('📋 分類設定:', settings.categories);
        console.log('👥 帳戶設定:', settings.accounts);
        
        // 4. 檢查檔案是否已創建
        console.log('4️⃣ 檢查檔案是否已創建...');
        const checkResponse = await gapi.client.drive.files.list({
            q: "name='user_setting.json' and trashed=false",
            fields: 'files(id, name, modifiedTime, size)'
        });
        
        const newFiles = checkResponse.result.files;
        if (newFiles && newFiles.length > 0) {
            console.log('✅ 設定檔案已成功創建:', newFiles[0]);
            
            // 下載並驗證檔案內容
            const contentResponse = await gapi.client.drive.files.get({
                fileId: newFiles[0].id,
                alt: 'media'
            });
            const fileContent = contentResponse.result;
            console.log('📄 檔案內容驗證:', fileContent);
            
            // 驗證關鍵欄位
            if (fileContent.userId === userId) {
                console.log('✅ 用戶 ID 正確');
            } else {
                console.error('❌ 用戶 ID 不匹配');
            }
            
            if (fileContent.lastUpdated) {
                console.log('✅ 時間戳已設置');
            } else {
                console.error('❌ 時間戳未設置');
            }
            
            if (fileContent.categories && fileContent.categories.expense && fileContent.categories.income) {
                console.log('✅ 分類設定正確');
            } else {
                console.error('❌ 分類設定不正確');
            }
            
        } else {
            console.error('❌ 設定檔案未創建');
        }
        
        // 5. 測試設定更新
        console.log('5️⃣ 測試設定更新...');
        await userSettingsService.updateSettings({
            preferences: {
                language: settings.preferences.language === 'zh-TW' ? 'en' : 'zh-TW'
            }
        });
        
        const updatedSettings = userSettingsService.getSettings();
        console.log('✅ 設定更新成功:', updatedSettings.preferences.language);
        
        console.log('🎉 新用戶流程測試完成！');
        console.log('📁 請檢查你的 Google Drive "QuickBook Data" 資料夾中的 user_setting.json 檔案');
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
    }
}

// 檢查 init_setting.json 內容
function checkInitSettings() {
    console.log('📋 檢查 init_setting.json 內容...');
    
    // 這裡我們無法直接讀取本地檔案，但可以顯示預期結構
    const expectedStructure = {
        version: "1.0.0",
        preferences: {
            language: "zh-TW",
            currency: { default: "TWD", displayCurrency: "TWD" },
            customCurrencies: ["TWD", "USD", "JPY", "EUR", "KRW", "CNY"]
        },
        modules: {
            budget: true,
            splitwise: true,
            invest: true,
            exchange_rate: true
        },
        homeWidgets: {
            assetCard: true,
            tPlusTwo: true,
            transactions: true
        },
        accounts: [
            { id: "acc_cash", name: "現金", type: "cash", currency: "TWD" },
            { id: "acc_bank", name: "銀行帳戶", type: "bank", currency: "TWD" }
        ],
        categories: {
            income: [
                { id: "salary", name: "薪資", color: "#10b981" },
                { id: "bonus", name: "獎金", color: "#10b981" }
            ],
            expense: [
                { id: "food", name: "餐飲", color: "#ef4444" },
                { id: "transport", name: "交通", color: "#ef4444" }
            ]
        }
    };
    
    console.log('📄 預期的 init_setting.json 結構:', expectedStructure);
}

// 運行測試
console.log('🚀 開始新用戶流程測試...');
testNewUserFlow().then(() => {
    console.log('🔍 檢查 init_setting.json 結構...');
    checkInitSettings();
});
