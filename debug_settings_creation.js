// 詳細調試 user_setting.json 創建過程
// 在瀏覽器控制台中運行此代碼來診斷問題

async function debugSettingsCreation() {
    console.log('🔍 開始詳細調試 user_setting.json 創建過程...');
    
    try {
        // 1. 檢查登入狀態
        console.log('\n1️⃣ 檢查登入狀態...');
        if (!gapi.auth2 || !gapi.auth2.getAuthInstance()) {
            console.error('❌ Google API 未初始化');
            return;
        }
        
        const isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
        if (!isSignedIn) {
            console.error('❌ 用戶未登入 Google');
            return;
        }
        
        const currentUser = gapi.auth2.getAuthInstance().currentUser.get();
        const userId = currentUser.getBasicProfile().getId();
        console.log('✅ 登入狀態正常，用戶 ID:', userId);
        
        // 2. 檢查 Google Drive 權限
        console.log('\n2️⃣ 檢查 Google Drive 權限...');
        try {
            const testResponse = await gapi.client.drive.files.list({
                q: "trashed=false",
                fields: 'files(id, name)',
                pageSize: 1
            });
            console.log('✅ Google Drive 權限正常，找到', testResponse.result.files?.length || 0, '個檔案');
        } catch (permError) {
            console.error('❌ Google Drive 權限不足:', permError);
            return;
        }
        
        // 3. 檢查 QuickBook Data 資料夾
        console.log('\n3️⃣ 檢查 QuickBook Data 資料夾...');
        const folderResponse = await gapi.client.drive.files.list({
            q: "name='QuickBook Data' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: 'files(id, name, createdTime)'
        });
        
        const folders = folderResponse.result.files;
        console.log('📁 找到 QuickBook Data 資料夾:', folders.length);
        
        let folderId;
        if (folders.length === 0) {
            console.log('📁 QuickBook Data 資料夾不存在，需要創建');
            
            // 嘗試創建資料夾
            try {
                console.log('🔧 嘗試創建 QuickBook Data 資料夾...');
                const createResponse = await gapi.client.drive.files.create({
                    resource: {
                        name: 'QuickBook Data',
                        mimeType: 'application/vnd.google-apps.folder'
                    },
                    fields: 'id'
                });
                folderId = createResponse.result.id;
                console.log('✅ 資料夾創建成功，ID:', folderId);
            } catch (createError) {
                console.error('❌ 創建資料夾失敗:', createError);
                console.error('詳細錯誤:', createError.result?.error);
                return;
            }
        } else {
            folderId = folders[0].id;
            console.log('✅ 資料夾已存在，ID:', folderId);
        }
        
        // 4. 檢查現有的 user_setting.json
        console.log('\n4️⃣ 檢查現有的 user_setting.json...');
        const fileResponse = await gapi.client.drive.files.list({
            q: `name='user_setting.json' and '${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, createdTime, modifiedTime, size)'
        });
        
        const existingFiles = fileResponse.result.files;
        console.log('📄 找到 user_setting.json:', existingFiles.length);
        
        if (existingFiles.length > 0) {
            console.log('✅ 檔案已存在:', existingFiles[0]);
            console.log('📄 檔案大小:', existingFiles[0].size, 'bytes');
        } else {
            console.log('📄 檔案不存在，需要創建');
        }
        
        // 5. 手動創建測試設定
        console.log('\n5️⃣ 手動創建測試設定...');
        const testSettings = {
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
            userId: userId,
            preferences: {
                language: "zh-TW",
                theme: "dark",
                currency: {
                    default: "TWD",
                    displayCurrency: "TWD"
                },
                dateFormat: "YYYY-MM-DD",
                timeFormat: "24h",
                customCurrencies: ["TWD", "USD", "JPY", "EUR", "KRW", "CNY"]
            },
            modules: {
                budget: true,
                splitwise: true,
                invest: true,
                family: false,
                fund: false,
                futures: false,
                tw_stock: false,
                us_stock: false,
                crypto: false,
                metal: false,
                real_estate: false,
                exchange_rate: true
            },
            homeWidgets: {
                assetCard: true,
                tPlusTwo: true,
                transactions: true
            },
            accounts: [
                {
                    id: "acc_cash",
                    name: "現金=2",
                    type: "cash",
                    currency: "TWD"
                },
                {
                    id: "acc_bank",
                    name: "銀行帳戶",
                    type: "bank",
                    currency: "TWD"
                }
            ],
            categories: {
                income: [
                    { id: "salary", name: "薪資", color: "#10b981" },
                    { id: "bonus", name: "獎金", color: "#10b981" },
                    { id: "investment", name: "投資收益", color: "#10b981" },
                    { id: "other_income", name: "其他收入", color: "#10b981" }
                ],
                expense: [
                    { id: "food", name: "餐飲", color: "#ef4444" },
                    { id: "transport", name: "交通", color: "#ef4444" },
                    { id: "housing", name: "住房", color: "#ef4444" },
                    { id: "entertainment", name: "娛樂", color: "#ef4444" },
                    { id: "education", name: "教育", color: "#ef4444" },
                    { id: "health", name: "醫療", color: "#ef4444" },
                    { id: "shopping", name: "購物", color: "#ef4444" },
                    { id: "utilities", name: "水電費", color: "#ef4444" },
                    { id: "other_expense", name: "其他支出", color: "#ef4444" }
                ]
            },
            ui: {
                compactMode: false,
                showAnimations: true,
                autoBackup: true
            }
        };
        
        console.log('📄 測試設定準備完成，大小:', JSON.stringify(testSettings, null, 2).length, '字元');
        
        // 6. 嘗試創建檔案
        console.log('\n6️⃣ 嘗試創建 user_setting.json...');
        try {
            const settingsJson = JSON.stringify(testSettings, null, 2);
            console.log('📄 JSON 內容長度:', settingsJson.length, '字元');
            
            // 方法 1: 使用 gapi.client.request
            console.log('🔧 方法 1: 使用 gapi.client.request...');
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
            
            console.log('✅ 檔案創建成功:', createResponse.result);
            console.log('📄 檔案 ID:', createResponse.result.id);
            
        } catch (createError) {
            console.error('❌ 創建檔案失敗:', createError);
            console.error('錯誤詳情:', createError.result?.error);
            
            // 嘗試方法 2: 使用 multipart
            console.log('🔧 嘗試方法 2: 使用 multipart 上傳...');
            try {
                const metadata = {
                    name: 'user_setting.json',
                    parents: [folderId]
                };
                
                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                form.append('file', new Blob([settingsJson], { type: 'application/json' }));
                
                const token = gapi.auth.getToken().access_token;
                const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: form
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ 方法 2 成功:', result);
                } else {
                    console.error('❌ 方法 2 也失敗:', response.status, response.statusText);
                }
                
            } catch (method2Error) {
                console.error('❌ 方法 2 也失敗:', method2Error);
            }
        }
        
        // 7. 驗證檔案是否真的創建了
        console.log('\n7️⃣ 驗證檔案是否創建成功...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // 等待 2 秒
        
        const verifyResponse = await gapi.client.drive.files.list({
            q: `name='user_setting.json' and '${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, createdTime, modifiedTime, size)'
        });
        
        const verifyFiles = verifyResponse.result.files;
        console.log('📄 驗證結果 - 找到檔案:', verifyFiles.length);
        
        if (verifyFiles.length > 0) {
            const file = verifyFiles[0];
            console.log('✅ 檔案創建成功!');
            console.log('📄 檔案詳情:', {
                id: file.id,
                name: file.name,
                size: file.size + ' bytes',
                createdTime: file.createdTime,
                modifiedTime: file.modifiedTime
            });
            
            // 嘗試下載內容驗證
            try {
                const downloadResponse = await gapi.client.drive.files.get({
                    fileId: file.id,
                    alt: 'media'
                });
                console.log('✅ 檔案內容驗證成功');
                console.log('📊 模組設定:', downloadResponse.result.modules);
            } catch (downloadError) {
                console.error('❌ 下載檔案內容失敗:', downloadError);
            }
        } else {
            console.error('❌ 檔案創建失敗，仍然找不到檔案');
        }
        
        console.log('\n🎉 調試完成！');
        
    } catch (error) {
        console.error('❌ 調試過程中發生錯誤:', error);
        console.error('錯誤詳情:', error.result?.error);
    }
}

// 顯示問題診斷指引
function showDiagnosticGuide() {
    console.log('\n📋 可能的問題原因:');
    console.log('1. 🔐 Google Drive 權限不足');
    console.log('2. 📁 資料夾創建失敗');
    console.log('3. 📄 檔案上傳失敗');
    console.log('4. 🌐 網路連線問題');
    console.log('5. ⏰ API 限制或暫停');
    console.log('6. 📝 JSON 格式問題');
    console.log('7. 🔄 異步操作問題');
    
    console.log('\n🔧 解決方案:');
    console.log('1. 重新登入 Google 帳號');
    console.log('2. 檢查 Google Drive 權限設定');
    console.log('3. 清除瀏覽器快取重新載入');
    console.log('4. 檢查網路連線');
    console.log('5. 稍後再試');
}

// 運行調試
console.log('🚀 開始詳細調試...');
debugSettingsCreation().then(() => {
    showDiagnosticGuide();
});
