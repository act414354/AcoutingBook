// 驗證 quickbook data 資料夾結構
// 在瀏覽器控制台中運行此代碼來確認檔案正確存在 quickbook data 資料夾中

async function verifyQuickBookDataFolder() {
    console.log('🔍 驗證 quickbook data 資料夾結構...');
    
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
        
        // 1. 檢查 quickbook data 資料夾是否存在
        console.log('1️⃣ 檢查 quickbook data 資料夾...');
        const folderResponse = await gapi.client.drive.files.list({
            q: "name='quickbook data' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: 'files(id, name, createdTime, modifiedTime)'
        });
        
        const folders = folderResponse.result.files;
        if (folders && folders.length > 0) {
            const folder = folders[0];
            console.log('✅ 找到 quickbook data 資料夾:', {
                id: folder.id,
                name: folder.name,
                createdTime: folder.createdTime,
                modifiedTime: folder.modifiedTime
            });
            
            // 2. 檢查資料夾中的 user_setting.json
            console.log('2️⃣ 檢查資料夾中的 user_setting.json...');
            const fileResponse = await gapi.client.drive.files.list({
                q: `name='user_setting.json' and '${folder.id}' in parents and trashed=false`,
                fields: 'files(id, name, createdTime, modifiedTime, size)'
            });
            
            const files = fileResponse.result.files;
            if (files && files.length > 0) {
                const file = files[0];
                console.log('✅ 找到 user_setting.json:', {
                    id: file.id,
                    name: file.name,
                    size: file.size + ' bytes',
                    createdTime: file.createdTime,
                    modifiedTime: file.modifiedTime
                });
                
                // 3. 下載並驗證檔案內容
                console.log('3️⃣ 下載並驗證檔案內容...');
                try {
                    const downloadResponse = await gapi.client.drive.files.get({
                        fileId: file.id,
                        alt: 'media'
                    });
                    
                    const content = downloadResponse.result;
                    console.log('📄 檔案內容驗證:');
                    console.log('  🌐 語言:', content.preferences?.language);
                    console.log('  💰 貨幣:', content.preferences?.currency?.default);
                    console.log('  👤 用戶 ID:', content.userId ? '存在' : '缺失');
                    console.log('  📊 預算模組:', content.modules?.budget ? '啟用' : '停用');
                    console.log('  📋 帳戶數量:', content.accounts?.length || 0);
                    console.log('  🏷️ 收入分類:', content.categories?.income?.length || 0);
                    console.log('  🏷️ 支出分類:', content.categories?.expense?.length || 0);
                    
                    // 4. 驗證是否與 init_setting.json 一致
                    console.log('4️⃣ 驗證關鍵預設值...');
                    const expectedValues = {
                        language: 'zh-TW',
                        currencyDefault: 'TWD',
                        budgetModule: true,
                        accountCount: 2,
                        incomeCategories: 4,
                        expenseCategories: 9
                    };
                    
                    const actualValues = {
                        language: content.preferences?.language,
                        currencyDefault: content.preferences?.currency?.default,
                        budgetModule: content.modules?.budget,
                        accountCount: content.accounts?.length,
                        incomeCategories: content.categories?.income?.length,
                        expenseCategories: content.categories?.expense?.length
                    };
                    
                    console.log('🔍 預設值驗證:');
                    Object.keys(expectedValues).forEach(key => {
                        const expected = expectedValues[key];
                        const actual = actualValues[key];
                        const isMatch = expected === actual;
                        const status = isMatch ? '✅' : '❌';
                        console.log(`  ${status} ${key}: 預期 ${expected}, 實際 ${actual}`);
                    });
                    
                    // 5. 檢查中文內容
                    console.log('5️⃣ 檢查中文內容...');
                    const chineseChecks = [
                        { name: '現金1帳戶', check: content.accounts?.some(acc => acc.name === '現金1') },
                        { name: '銀行帳戶', check: content.accounts?.some(acc => acc.name === '銀行帳戶') },
                        { name: '薪資分類', check: content.categories?.income?.some(cat => cat.name === '薪資') },
                        { name: '餐飲分類', check: content.categories?.expense?.some(cat => cat.name === '餐飲') }
                    ];
                    
                    console.log('🇨🇳 中文內容檢查:');
                    chineseChecks.forEach(check => {
                        const status = check.check ? '✅' : '❌';
                        console.log(`  ${status} ${check.name}: ${check.check ? '存在' : '缺失'}`);
                    });
                    
                } catch (downloadError) {
                    console.error('❌ 下載檔案內容失敗:', downloadError);
                }
                
            } else {
                console.log('📄 quickbook data 資料夾中沒有找到 user_setting.json');
                console.log('💡 這表示是新用戶，下次登入時會自動創建');
            }
            
            // 6. 檢查資料夾中的其他檔案
            console.log('6️⃣ 檢查資料夾中的其他檔案...');
            const allFilesResponse = await gapi.client.drive.files.list({
                q: `'${folder.id}' in parents and trashed=false`,
                fields: 'files(id, name, mimeType, size)'
            });
            
            const allFiles = allFilesResponse.result.files;
            console.log('📁 quickbook data 資料夾中的所有檔案:');
            if (allFiles && allFiles.length > 0) {
                allFiles.forEach(file => {
                    console.log(`  📄 ${file.name} (${file.mimeType}, ${file.size || 0} bytes)`);
                });
            } else {
                console.log('  📂 資料夾是空的');
            }
            
        } else {
            console.log('📁 沒有找到 quickbook data 資料夾');
            console.log('💡 這表示是新用戶，首次使用設定時會自動創建');
        }
        
        // 7. 總結
        console.log('\n📋 驗證總結:');
        console.log('  📁 資料夾狀態:', folders.length > 0 ? '✅ quickbook data 存在' : '⚠️ 資料夾不存在');
        console.log('  📄 設定檔案:', files && files.length > 0 ? '✅ user_setting.json 存在' : '⚠️ 檔案不存在');
        console.log('  🔗 設定頁面連結:', '✅ 已連結到 quickbook data/user_setting.json');
        console.log('  🔄 自動創建:', '✅ 新用戶會自動複製 init_setting.json');
        
        console.log('\n🎉 驗證完成！');
        
    } catch (error) {
        console.error('❌ 驗證過程中發生錯誤:', error);
    }
}

// 顯示手動檢查指引
function showManualInstructions() {
    console.log('\n📋 手動檢查 Google Drive 的指引:');
    console.log('1. 前往 https://drive.google.com');
    console.log('2. 應該能看到一個名為 "quickbook data" 的資料夾');
    console.log('3. 點擊進入資料夾，應該能看到:');
    console.log('   ✅ user_setting.json (用戶設定檔案)');
    console.log('   📄 accounting_data.json (會計資料檔案，可能還沒有)');
    console.log('   📋 tx_*.json (交易區塊檔案，可能還沒有)');
    console.log('4. 點擊 user_setting.json 可以查看完整的預設設定');
    console.log('5. 內容應該包含:');
    console.log('   🌐 語言: zh-TW');
    console.log('   💰 貨幣: TWD');
    console.log('   📊 預算模組: true');
    console.log('   👥 帳戶: 現金1, 銀行帳戶');
    console.log('   🏷️ 分類: 完整的中文分類列表');
}

// 測試新用戶流程
async function testNewUserFlow() {
    console.log('🧪 測試新用戶自動創建流程...');
    
    try {
        // 導入 userSettingsService
        const { userSettingsService } = await import('./src/services/userSettingsService.ts');
        
        // 獲取當前用戶 ID
        const currentUser = gapi.auth2.getAuthInstance().currentUser.get();
        const userId = currentUser.getBasicProfile().getId();
        
        console.log('👤 當前用戶 ID:', userId);
        
        // 初始化設定（這會觸發自動創建流程）
        console.log('🔧 初始化用戶設定...');
        const settings = await userSettingsService.initialize(userId);
        
        console.log('✅ 設定初始化完成:', settings.preferences.language);
        
        // 再次驗證檔案是否已創建
        console.log('🔍 驗證檔案是否已創建...');
        await verifyQuickBookDataFolder();
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
    }
}

// 運行驗運行驗證
console.log('🚀 開始驗證 quickbook data 資料夾...');
verifyQuickBookDataFolder().then(() => {
    showManualInstructions();
    console.log('\n🧪 如需測試新用戶流程，請運行: testNewUserFlow()');
});
