// 強制創建 user_setting.json 檔案
// 在瀏覽器控制台中運行此代碼來解決檔案不存在的問題

async function forceCreateSettings() {
    console.log('🔧 強制創建 user_setting.json...');
    
    try {
        // 檢查登入狀態
        if (!gapi.auth2 || !gapi.auth2.getAuthInstance()) {
            console.error('❌ Google API 未初始化，請先登入');
            return;
        }
        
        const isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
        if (!isSignedIn) {
            console.error('❌ 用戶未登入 Google');
            return;
        }
        
        // 獲取當前用戶 ID
        const currentUser = gapi.auth2.getAuthInstance().currentUser.get();
        const userId = currentUser.getBasicProfile().getId();
        console.log('👤 當前用戶 ID:', userId);
        
        // 導入 userSettingsService
        const { userSettingsService } = await import('./src/services/userSettingsService.ts');
        
        // 1. 先清除現有設定（如果有的話）
        console.log('🗑️ 清除現有設定...');
        await userSettingsService.clear();
        
        // 2. 強制重新初始化
        console.log('🔄 強制重新初始化設定...');
        const settings = await userSettingsService.initialize(userId);
        
        console.log('✅ 設定初始化完成:', settings);
        console.log('📊 模組設定:', settings.modules);
        console.log('🏠 首頁小工具:', settings.homeWidgets);
        console.log('👥 帳戶數量:', settings.accounts.length);
        console.log('🏷️ 分類數量:', {
            income: settings.categories.income.length,
            expense: settings.categories.expense.length
        });
        
        // 3. 驗證檔案是否已創建
        console.log('🔍 驗證檔案是否已創建...');
        
        // 檢查 QuickBook Data 資料夾
        const folderResponse = await gapi.client.drive.files.list({
            q: "name='QuickBook Data' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: 'files(id, name)'
        });
        
        const folders = folderResponse.result.files;
        if (folders && folders.length > 0) {
            const folderId = folders[0].id;
            console.log('✅ QuickBook Data 資料夾存在:', folderId);
            
            // 檢查資料夾中的檔案
            const fileResponse = await gapi.client.drive.files.list({
                q: `name='user_setting.json' and '${folderId}' in parents and trashed=false`,
                fields: 'files(id, name, createdTime, size)'
            });
            
            const files = fileResponse.result.files;
            if (files && files.length > 0) {
                const file = files[0];
                console.log('✅ user_setting.json 已創建:', {
                    id: file.id,
                    name: file.name,
                    size: file.size + ' bytes',
                    createdTime: file.createdTime
                });
                
                // 下載並驗證內容
                try {
                    const downloadResponse = await gapi.client.drive.files.get({
                        fileId: file.id,
                        alt: 'media'
                    });
                    
                    const content = downloadResponse.result;
                    console.log('📄 檔案內容驗證:');
                    console.log('  🌐 語言:', content.preferences?.language);
                    console.log('  💰 貨幣:', content.preferences?.currency?.default);
                    console.log('  📊 預算模組:', content.modules?.budget ? '啟用' : '停用');
                    console.log('  📋 模組總數:', Object.keys(content.modules || {}).length);
                    
                    // 顯示所有模組狀態
                    console.log('🔧 所有模組狀態:');
                    Object.entries(content.modules || {}).forEach(([key, value]) => {
                        const status = value ? '✅ 開啟' : '❌ 關閉';
                        console.log(`  ${status} ${key}`);
                    });
                    
                } catch (downloadError) {
                    console.error('❌ 下載檔案內容失敗:', downloadError);
                }
                
            } else {
                console.error('❌ user_setting.json 仍然不存在');
            }
        } else {
            console.error('❌ QuickBook Data 資料夾不存在');
        }
        
        // 4. 重新載入頁面設定
        console.log('🔄 重新載入頁面設定...');
        window.location.reload();
        
    } catch (error) {
        console.error('❌ 強制創建設定失敗:', error);
    }
}

// 檢查當前設定狀態
async function checkCurrentSettings() {
    console.log('🔍 檢查當前設定狀態...');
    
    try {
        const { userSettingsService } = await import('./src/services/userSettingsService.ts');
        
        const settings = userSettingsService.getSettings();
        if (settings) {
            console.log('✅ 當前設定已載入:');
            console.log('  📊 模組:', settings.modules);
            console.log('  🏠 小工具:', settings.homeWidgets);
        } else {
            console.log('❌ 當前沒有載入設定');
        }
        
    } catch (error) {
        console.error('❌ 檢查設定失敗:', error);
    }
}

// 顯示指引
function showInstructions() {
    console.log('\n📋 解決問題的步驟:');
    console.log('1. 運行 forceCreateSettings() 來強制創建設定檔案');
    console.log('2. 頁面會自動重新載入');
    console.log('3. 重新載入後，設定頁面應該會顯示模組開關');
    console.log('4. 如果還是沒有，請檢查瀏覽器控制台的錯誤訊息');
    console.log('\n🔍 如果需要檢查當前狀態，運行: checkCurrentSettings()');
}

// 運行指引
console.log('🚀 準備解決 user_setting.json 不存在的問題...');
showInstructions();
console.log('\n💡 要立即修復，請運行: forceCreateSettings()');
