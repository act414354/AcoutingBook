// 清理 Google Drive 根目錄中的舊交易區塊
export const cleanupOldBlocks = async () => {
    try {
        console.log('🧹 開始清理 Google Drive 根目錄中的舊交易區塊...');
        
        // 搜尋根目錄中的交易區塊
        const query = "properties has { key='type' and value='transaction_block' } and trashed=false";
        
        const response = await gapi.client.drive.files.list({
            q: query,
            fields: 'files(id, name, createdTime)',
            pageSize: 100
        });

        const files = response.result.files || [];
        console.log(`📁 找到 ${files.length} 個根目錄中的交易區塊`);

        if (files.length > 0) {
            // 確認是否要刪除
            const confirmed = confirm(`找到 ${files.length} 個在根目錄的交易區塊，是否要刪除它們？\n這些檔案應該在 QuickBook Data 資料夾中。`);
            
            if (confirmed) {
                for (const file of files) {
                    try {
                        await gapi.client.drive.files.delete({
                            fileId: file.id!
                        });
                        console.log(`🗑️ 已刪除: ${file.name}`);
                    } catch (error) {
                        console.error(`❌ 刪除失敗 ${file.name}:`, error);
                    }
                }
                console.log('✅ 清理完成');
            } else {
                console.log('⏸️ 用戶取消清理操作');
            }
        } else {
            console.log('✅ 根目錄中沒有找到交易區塊');
        }
        
    } catch (error) {
        console.error('❌ 清理失敗:', error);
    }
};

// 在控制台中執行：cleanupOldBlocks()
