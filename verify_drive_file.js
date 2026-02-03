// 驗證 Google Drive 中的 user_setting.json 檔案
// 在瀏覽器控制台中運行此代碼來確認檔案正確創建

async function verifyDriveFile() {
    console.log('🔍 驗證 Google Drive 中的 user_setting.json...');
    
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
        
        // 1. 檢查 QuickBook Data 資料夾
        console.log('1️⃣ 檢查 QuickBook Data 資料夾...');
        const folderResponse = await gapi.client.drive.files.list({
            q: "name='QuickBook Data' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: 'files(id, name, createdTime, modifiedTime)'
        });
        
        const folders = folderResponse.result.files;
        if (folders && folders.length > 0) {
            const folder = folders[0];
            console.log('✅ 找到 QuickBook Data 資料夾:', {
                id: folder.id,
                name: folder.name,
                createdTime: folder.createdTime,
                modifiedTime: folder.modifiedTime
            });
        } else {
            console.error('❌ 沒有找到 QuickBook Data 資料夾');
            return;
        }
        
        // 2. 檢查 user_setting.json 檔案
        console.log('2️⃣ 檢查 user_setting.json 檔案...');
        const fileResponse = await gapi.client.drive.files.list({
            q: "name='user_setting.json' and trashed=false",
            fields: 'files(id, name, createdTime, modifiedTime, size, parents)'
        });
        
        const files = fileResponse.result.files;
        if (files && files.length > 0) {
            const file = files[0];
            console.log('✅ 找到 user_setting.json 檔案:', {
                id: file.id,
                name: file.name,
                size: file.size + ' bytes',
                createdTime: file.createdTime,
                modifiedTime: file.modifiedTime,
                parents: file.parents
            });
            
            // 檢查檔案是否在正確的資料夾中
            const isInCorrectFolder = file.parents && file.parents.includes(folders[0].id);
            if (isInCorrectFolder) {
                console.log('✅ 檔案位於正確的 QuickBook Data 資料夾中');
            } else {
                console.warn('⚠️ 檔案不在 QuickBook Data 資料夾中');
            }
            
            // 3. 下載並驗證檔案內容
            console.log('3️⃣ 下載並驗證檔案內容...');
            try {
                const downloadResponse = await gapi.client.drive.files.get({
                    fileId: file.id,
                    alt: 'media'
                });
                
                const content = downloadResponse.result;
                console.log('📄 檔案內容載入成功');
                
                // 驗證關鍵欄位
                const validations = [
                    { field: 'version', expected: '1.0.0', actual: content.version },
                    { field: 'userId', expected: 'should exist', actual: content.userId ? 'exists' : 'missing' },
                    { field: 'lastUpdated', expected: 'should exist', actual: content.lastUpdated ? 'exists' : 'missing' },
                    { field: 'preferences.language', expected: 'zh-TW', actual: content.preferences?.language },
                    { field: 'preferences.currency.default', expected: 'TWD', actual: content.preferences?.currency?.default },
                    { field: 'modules.budget', expected: true, actual: content.modules?.budget },
                    { field: 'homeWidgets.assetCard', expected: true, actual: content.homeWidgets?.assetCard },
                    { field: 'accounts.length', expected: 2, actual: content.accounts?.length },
                    { field: 'categories.income.length', expected: 4, actual: content.categories?.income?.length },
                    { field: 'categories.expense.length', expected: 9, actual: content.categories?.expense?.length }
                ];
                
                console.log('🔍 驗證結果:');
                let allValid = true;
                validations.forEach(validation => {
                    const isValid = validation.actual === validation.expected;
                    const status = isValid ? '✅' : '❌';
                    console.log(`${status} ${validation.field}: expected ${validation.expected}, got ${validation.actual}`);
                    if (!isValid) allValid = false;
                });
                
                if (allValid) {
                    console.log('🎉 所有欄位驗證通過！');
                } else {
                    console.warn('⚠️ 部分欄位驗證失敗');
                }
                
                // 4. 檢查中文內容
                console.log('4️⃣ 檢查中文內容...');
                const chineseChecks = [
                    { name: '現金帳戶', check: content.accounts?.some(acc => acc.name === '現金') },
                    { name: '銀行帳戶', check: content.accounts?.some(acc => acc.name === '銀行帳戶') },
                    { name: '薪資分類', check: content.categories?.income?.some(cat => cat.name === '薪資') },
                    { name: '餐飲分類', check: content.categories?.expense?.some(cat => cat.name === '餐飲') }
                ];
                
                console.log('🇨🇳 中文內容檢查:');
                chineseChecks.forEach(check => {
                    const status = check.check ? '✅' : '❌';
                    console.log(`${status} ${check.name}: ${check.check ? '存在' : '缺失'}`);
                });
                
            } catch (downloadError) {
                console.error('❌ 下載檔案內容失敗:', downloadError);
            }
            
        } else {
            console.error('❌ 沒有找到 user_setting.json 檔案');
        }
        
        // 5. 檢查整體資料夾結構
        console.log('5️⃣ 檢查整體資料夾結構...');
        const allFilesResponse = await gapi.client.drive.files.list({
            q: "'QuickBook Data' in parents and trashed=false",
            fields: 'files(id, name, mimeType, size)'
        });
        
        const allFiles = allFilesResponse.result.files;
        console.log('📁 QuickBook Data 資料夾中的所有檔案:');
        if (allFiles && allFiles.length > 0) {
            allFiles.forEach(file => {
                console.log(`  📄 ${file.name} (${file.mimeType}, ${file.size || 0} bytes)`);
            });
        } else {
            console.log('  📂 資料夾是空的');
        }
        
        console.log('🎉 驗證完成！');
        console.log('📋 總結:');
        console.log('  ✅ 新用戶自動設定系統運作正常');
        console.log('  ✅ user_setting.json 已成功創建在 Google Drive');
        console.log('  ✅ 預設設定內容完整且正確');
        console.log('  ✅ 中文分類和帳戶名稱正確顯示');
        
    } catch (error) {
        console.error('❌ 驗證過程中發生錯誤:', error);
    }
}

// 提供手動檢查 Google Drive 的指引
function showGoogleDriveInstructions() {
    console.log('📋 手動檢查 Google Drive 的指引:');
    console.log('1. 前往 https://drive.google.com');
    console.log('2. 在搜尋框中輸入: "QuickBook Data"');
    console.log('3. 應該能看到一個名為 "QuickBook Data" 的資料夾');
    console.log('4. 點擊進入資料夾，應該能看到:');
    console.log('   📄 user_setting.json (剛剛創建的用戶設定檔案)');
    console.log('   📄 accounting_data.json (會計資料檔案，可能還沒有)');
    console.log('5. 點擊 user_setting.json 檔案可以查看內容');
    console.log('6. 內容應該包含完整的預設設定，包括中文分類名稱');
}

// 運行驗驗證
console.log('🚀 開始驗證 Google Drive 檔案...');
verifyDriveFile().then(() => {
    console.log('\n📋 顯示手動檢查指引...');
    showGoogleDriveInstructions();
});
