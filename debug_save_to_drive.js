// 詳細調試 saveToDrive 方法
// 在瀏覽器控制台中運行此代碼來檢查保存問題

async function debugSaveToDrive() {
    console.log('🔍 開始調試 saveToDrive 方法...');
    
    try {
        // 1. 檢查 userSettingsService 狀態
        console.log('\n1️⃣ 檢查 userSettingsService 狀態...');
        const { userSettingsService } = await import('./src/services/userSettingsService.ts');
        
        const currentSettings = userSettingsService.getSettings();
        console.log('當前設定:', currentSettings);
        
        if (!currentSettings) {
            console.log('❌ 沒有設定可保存，創建測試設定...');
            const testSettings = {
                version: "1.0.0",
                lastUpdated: new Date().toISOString(),
                userId: "test-user-id",
                preferences: {
                    language: "zh-TW",
                    theme: "dark",
                    currency: { default: "TWD", displayCurrency: "TWD" }
                },
                modules: { budget: true, splitwise: true }
            };
            
            await userSettingsService.setSettings(testSettings);
            console.log('✅ 測試設定已創建');
        }
        
        // 2. 檢查 Google API 狀態
        console.log('\n2️⃣ 檢查 Google API 狀態...');
        if (!gapi?.auth2?.getAuthInstance()) {
            console.error('❌ Google API 未初始化');
            return;
        }
        
        const isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
        if (!isSignedIn) {
            console.error('❌ 用戶未登入');
            return;
        }
        
        console.log('✅ Google API 狀態正常');
        
        // 3. 手動執行 saveToDrive 的每個步驟
        console.log('\n3️⃣ 手動執行 saveToDrive 步驟...');
        
        // 步驟 1: 檢查 QuickBook Data 資料夾
        console.log('📁 檢查 QuickBook Data 資料夾...');
        const folderResponse = await gapi.client.drive.files.list({
            q: "name='QuickBook Data' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: 'files(id, name)'
        });
        
        console.log('資料夾查詢結果:', folderResponse.result);
        const folders = folderResponse.result.files;
        console.log('找到資料夾數量:', folders?.length || 0);
        
        let folderId;
        if (!folders || folders.length === 0) {
            console.log('📁 資料夾不存在，創建中...');
            
            // 嘗試創建資料夾
            try {
                const createResponse = await gapi.client.drive.files.create({
                    resource: {
                        name: 'QuickBook Data',
                        mimeType: 'application/vnd.google-apps.folder'
                    },
                    fields: 'id'
                });
                folderId = createResponse.result.id;
                console.log('✅ 資料夾創建成功:', folderId);
            } catch (createError) {
                console.error('❌ 創建資料夾失敗:', createError);
                console.error('詳細錯誤:', createError.result?.error);
                return;
            }
        } else {
            folderId = folders[0].id!;
            console.log('✅ 資料夾已存在:', folderId);
        }
        
        // 步驟 2: 檢查現有檔案
        console.log('\n📄 檢查現有 user_setting.json...');
        const fileResponse = await gapi.client.drive.files.list({
            q: `name='user_setting.json' and '${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, modifiedTime, size)'
        });
        
        console.log('檔案查詢結果:', fileResponse.result);
        const files = fileResponse.result.files;
        console.log('找到檔案數量:', files?.length || 0);
        
        // 步驟 3: 準備設定數據
        console.log('\n📝 準備設定數據...');
        const settings = userSettingsService.getSettings();
        const settingsJson = JSON.stringify(settings, null, 2);
        console.log('設定 JSON 長度:', settingsJson.length);
        console.log('設定 JSON 內容預覽:', settingsJson.substring(0, 200) + '...');
        
        // 步驟 4: 嘗試保存檔案
        console.log('\n💾 嘗試保存檔案...');
        
        if (files && files.length > 0) {
            // 更新現有檔案
            const fileId = files[0].id!;
            console.log('🔄 更新現有檔案:', fileId);
            
            try {
                const updateResponse = await gapi.client.request({
                    path: `/upload/drive/v3/files/${fileId}`,
                    method: 'PATCH',
                    params: {
                        uploadType: 'media'
                    },
                    body: settingsJson
                });
                console.log('✅ 檔案更新成功:', updateResponse.result);
            } catch (updateError) {
                console.error('❌ 更新檔案失敗:', updateError);
                console.error('詳細錯誤:', updateError.result?.error);
                return;
            }
        } else {
            // 創建新檔案
            console.log('🆕 創建新檔案...');
            
            try {
                const createResponse = await gapi.client.request({
                    path: '/upload/drive/v3/files',
                    method: 'POST',
                    params: {
                        uploadType: 'media',
                        name: 'user_setting.json',
                        parents: [folderId]
                    },
                    body: settingsJson
                });
                console.log('✅ 新檔案創建成功:', createResponse.result);
            } catch (createError) {
                console.error('❌ 創建檔案失敗:', createError);
                console.error('詳細錯誤:', createError.result?.error);
                return;
            }
        }
        
        // 步驟 5: 驗證檔案是否真的保存了
        console.log('\n🔍 驗證檔案是否保存成功...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // 等待 2 秒
        
        const verifyResponse = await gapi.client.drive.files.list({
            q: `name='user_setting.json' and '${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, modifiedTime, size)'
        });
        
        const verifyFiles = verifyResponse.result.files;
        console.log('驗證結果 - 找到檔案數量:', verifyFiles?.length || 0);
        
        if (verifyFiles && verifyFiles.length > 0) {
            const file = verifyFiles[0];
            console.log('✅ 檔案保存成功!');
            console.log('檔案詳情:', {
                id: file.id,
                name: file.name,
                size: file.size + ' bytes',
                modifiedTime: file.modifiedTime
            });
            
            // 嘗試下載內容驗證
            try {
                const downloadResponse = await gapi.client.drive.files.get({
                    fileId: file.id,
                    alt: 'media'
                });
                console.log('✅ 檔案內容驗證成功');
                console.log('下載的設定:', downloadResponse.result);
            } catch (downloadError) {
                console.error('❌ 下載檔案內容失敗:', downloadError);
            }
        } else {
            console.error('❌ 檔案保存失敗，找不到檔案');
        }
        
        console.log('\n🎉 saveToDrive 調試完成!');
        
    } catch (error) {
        console.error('❌ 調試過程中發生錯誤:', error);
        console.error('錯誤詳情:', error.result?.error);
    }
}

// 顯示問題診斷指引
function showSaveToDriveDiagnosticGuide() {
    console.log('\n📋 saveToDrive 可能的問題原因:');
    console.log('1. 🔐 Google Drive 權限不足');
    console.log('2. 📁 資料夾創建/查詢失敗');
    console.log('3. 📄 檔案上傳參數錯誤');
    console.log('4. 🌐 網路連線問題');
    console.log('5. 📝 JSON 格式問題');
    console.log('6. ⏰ API 限制或暫停');
    console.log('7. 🔄 異步操作問題');
    
    console.log('\n🔧 解決方案:');
    console.log('1. 檢查 Google Drive 權限範圍');
    console.log('2. 驗證 API 參數格式');
    console.log('3. 檢查網路連線');
    console.log('4. 查看詳細錯誤訊息');
}

// 運行調試
console.log('🚀 開始 saveToDrive 詳細調試...');
debugSaveToDrive().then(() => {
    showSaveToDriveDiagnosticGuide();
});
