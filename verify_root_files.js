// 驗證檔案直接存在 Google Drive 根目錄
// 在瀏覽器控制台中運行此代碼來確認沒有創建資料夾

async function verifyRootFiles() {
    console.log('🔍 驗證檔案直接存在 Google Drive 根目錄...');
    
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
        
        // 1. 檢查是否沒有 QuickBook 或 QuickBook Data 資料夾
        console.log('1️⃣ 檢查是否沒有 QuickBook 相關資料夾...');
        
        const folderQueries = [
            "name='QuickBook' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            "name='QuickBook Data' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        ];
        
        let foundFolders = [];
        for (const query of folderQueries) {
            const response = await gapi.client.drive.files.list({
                q: query,
                fields: 'files(id, name, createdTime)'
            });
            
            const files = response.result.files || [];
            foundFolders = foundFolders.concat(files);
        }
        
        if (foundFolders.length === 0) {
            console.log('✅ 確認沒有 QuickBook 相關資料夾');
        } else {
            console.warn('⚠️ 發現 QuickBook 相關資料夾:', foundFolders);
        }
        
        // 2. 檢查 user_setting.json 是否在根目錄
        console.log('2️⃣ 檢查 user_setting.json 是否在根目錄...');
        
        const fileResponse = await gapi.client.drive.files.list({
            q: "name='user_setting.json' and trashed=false",
            fields: 'files(id, name, parents, createdTime, modifiedTime, size)'
        });
        
        const files = fileResponse.result.files;
        if (files && files.length > 0) {
            const file = files[0];
            console.log('✅ 找到 user_setting.json:', {
                id: file.id,
                name: file.name,
                size: file.size + ' bytes',
                createdTime: file.createdTime,
                modifiedTime: file.modifiedTime,
                parents: file.parents || '根目錄'
            });
            
            // 檢查是否真的在根目錄（沒有 parents）
            if (!file.parents || file.parents.length === 0) {
                console.log('✅ 確認檔案位於 Google Drive 根目錄');
            } else {
                console.warn('⚠️ 檔案位於資料夾中:', file.parents);
            }
            
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
                console.log('  👤 用戶 ID:', content.userId ? '存在' : '缺失');
                console.log('  📊 模組數量:', Object.keys(content.modules || {}).length);
                console.log('  📋 分類數量:', {
                    income: content.categories?.income?.length || 0,
                    expense: content.categories?.expense?.length || 0
                });
                
            } catch (downloadError) {
                console.error('❌ 下載檔案內容失敗:', downloadError);
            }
            
        } else {
            console.log('📄 沒有找到 user_setting.json（可能是新用戶）');
        }
        
        // 3. 檢查是否有交易區塊檔案在根目錄
        console.log('3️⃣ 檢查交易區塊檔案...');
        
        const blockResponse = await gapi.client.drive.files.list({
            q: "properties has { key='type' and value='transaction_block' } and trashed=false",
            fields: 'files(id, name, parents, createdTime)',
            pageSize: 10
        });
        
        const blockFiles = blockResponse.result.files || [];
        if (blockFiles.length > 0) {
            console.log(`✅ 找到 ${blockFiles.length} 個交易區塊檔案`);
            blockFiles.forEach((file, index) => {
                const isRoot = !file.parents || file.parents.length === 0;
                const location = isRoot ? '根目錄' : '資料夾中';
                console.log(`  📄 ${index + 1}. ${file.name} (${location})`);
            });
        } else {
            console.log('📄 沒有找到交易區塊檔案');
        }
        
        // 4. 檢查 accounting_data.json
        console.log('4️⃣ 檢查 accounting_data.json...');
        
        const dataResponse = await gapi.client.drive.files.list({
            q: "name='accounting_data.json' and trashed=false",
            fields: 'files(id, name, parents, createdTime, size)'
        });
        
        const dataFiles = dataResponse.result.files || [];
        if (dataFiles.length > 0) {
            const dataFile = dataFiles[0];
            const isRoot = !dataFile.parents || dataFile.parents.length === 0;
            const location = isRoot ? '根目錄' : '資料夾中';
            console.log('✅ 找到 accounting_data.json:', {
                name: dataFile.name,
                size: dataFile.size + ' bytes',
                location: location
            });
        } else {
            console.log('📄 沒有找到 accounting_data.json');
        }
        
        // 5. 總結
        console.log('\n📋 驗證總結:');
        console.log('  📁 資料夾狀態:', foundFolders.length === 0 ? '✅ 無 QuickBook 資料夾' : '⚠️ 有資料夾');
        console.log('  📄 user_setting.json:', files.length > 0 ? '✅ 存在於根目錄' : '⚠️ 不存在');
        console.log('  📋 交易區塊:', blockFiles.length > 0 ? `✅ ${blockFiles.length} 個檔案` : '⚠️ 無檔案');
        console.log('  📊 會計資料:', dataFiles.length > 0 ? '✅ 存在' : '⚠️ 不存在');
        
        console.log('\n🎉 驗證完成！');
        
    } catch (error) {
        console.error('❌ 驗證過程中發生錯誤:', error);
    }
}

// 顯示手動檢查指引
function showManualInstructions() {
    console.log('\n📋 手動檢查 Google Drive 的指引:');
    console.log('1. 前往 https://drive.google.com');
    console.log('2. 應該「不會」看到以下資料夾:');
    console.log('   ❌ QuickBook');
    console.log('   ❌ QuickBook Data');
    console.log('3. 應該在根目錄直接看到以下檔案:');
    console.log('   ✅ user_setting.json (用戶設定)');
    console.log('   📄 accounting_data.json (會計資料，可能還沒有)');
    console.log('   📋 tx_*.json (交易區塊檔案，可能還沒有)');
    console.log('4. 所有檔案都應該直接在 Google Drive 根目錄，不在任何子資料夾中');
}

// 運行驗運行驗證
console.log('🚀 開始驗證根目錄檔案...');
verifyRootFiles().then(() => {
    showManualInstructions();
});
