import { gapi } from 'gapi-script';

export class DriveFileChecker {
    // 檢查所有區塊鏈交易檔案
    static async checkBlockchainFiles(): Promise<any[]> {
        try {
            console.log('🔍 開始檢查 Google Drive 上的區塊鏈檔案...');
            
            // 檢查是否已登入
            // @ts-ignore
            const tokenObj = gapi.client.getToken();
            if (!tokenObj || !tokenObj.access_token) {
                throw new Error("用戶未登入，無法檢查檔案");
            }

            // 搜尋所有區塊鏈交易檔案
            const query = "properties has { key='type' and value='blockchain_transaction_block' } and trashed=false";
            
            const response = await gapi.client.drive.files.list({
                q: query,
                orderBy: 'createdTime desc',
                pageSize: 50,
                fields: 'files(id, name, createdTime, modifiedTime, size, properties, parents)'
            });

            const files = response.result.files || [];
            console.log(`📁 找到 ${files.length} 個區塊鏈檔案:`);
            
            files.forEach((file, index) => {
                console.log(`${index + 1}.`, {
                    id: file.id,
                    name: file.name,
                    createdTime: file.createdTime,
                    size: file.size || '未知',
                    properties: file.properties
                });
            });

            return files;
        } catch (error) {
            console.error('❌ 檢查檔案失敗:', error);
            throw error;
        }
    }

    // 檢查所有交易相關檔案（包括舊格式）
    static async checkAllTransactionFiles(): Promise<any[]> {
        try {
            console.log('🔍 開始檢查所有交易相關檔案...');
            
            // 檢查是否已登入
            // @ts-ignore
            const tokenObj = gapi.client.getToken();
            if (!tokenObj || !tokenObj.access_token) {
                throw new Error("用戶未登入，無法檢查檔案");
            }

            // 搜尋所有包含 'transaction' 或 'tx_' 的檔案
            const query = "(name contains 'transaction' or name contains 'tx_' or name contains 'blockchain') and trashed=false";
            
            const response = await gapi.client.drive.files.list({
                q: query,
                orderBy: 'createdTime desc',
                pageSize: 50,
                fields: 'files(id, name, createdTime, modifiedTime, size, properties, parents)'
            });

            const files = response.result.files || [];
            console.log(`📁 找到 ${files.length} 個交易相關檔案:`);
            
            files.forEach((file, index) => {
                console.log(`${index + 1}.`, {
                    id: file.id,
                    name: file.name,
                    createdTime: file.createdTime,
                    size: file.size || '未知',
                    properties: file.properties
                });
            });

            return files;
        } catch (error) {
            console.error('❌ 檢查檔案失敗:', error);
            throw error;
        }
    }

    // 檢查特定檔案是否存在
    static async checkSpecificFile(fileId: string): Promise<any> {
        try {
            console.log(`🔍 檢查特定檔案: ${fileId}`);
            
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                fields: 'id, name, createdTime, modifiedTime, size, properties, parents'
            });

            const file = response.result;
            console.log('📁 檔案詳情:', {
                id: file.id,
                name: file.name,
                createdTime: file.createdTime,
                modifiedTime: file.modifiedTime,
                size: file.size || '未知',
                properties: file.properties,
                parents: file.parents
            });

            return file;
        } catch (error) {
            console.error(`❌ 檢查檔案 ${fileId} 失敗:`, error);
            throw error;
        }
    }

    // 下載並顯示檔案內容
    static async downloadFileContent(fileId: string): Promise<any> {
        try {
            console.log(`📥 下載檔案內容: ${fileId}`);
            
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });

            const content = response.result;
            console.log('📄 檔案內容:', content);
            
            return content;
        } catch (error) {
            console.error(`❌ 下載檔案 ${fileId} 失敗:`, error);
            throw error;
        }
    }

    // 檢查根目錄的所有檔案
    static async checkRootDirectory(): Promise<any[]> {
        try {
            console.log('🔍 檢查根目錄的所有檔案...');
            
            // 檢查是否已登入
            // @ts-ignore
            const tokenObj = gapi.client.getToken();
            if (!tokenObj || !tokenObj.access_token) {
                throw new Error("用戶未登入，無法檢查檔案");
            }

            // 搜尋根目錄的所有檔案
            const query = "'root' in parents and trashed=false";
            
            const response = await gapi.client.drive.files.list({
                q: query,
                orderBy: 'createdTime desc',
                pageSize: 100,
                fields: 'files(id, name, createdTime, modifiedTime, size, mimeType)'
            });

            const files = response.result.files || [];
            console.log(`📁 根目錄共有 ${files.length} 個檔案:`);
            
            // 只顯示最近10個檔案
            const recentFiles = files.slice(0, 10);
            recentFiles.forEach((file, index) => {
                console.log(`${index + 1}.`, {
                    id: file.id,
                    name: file.name,
                    mimeType: file.mimeType,
                    createdTime: file.createdTime,
                    size: file.size || '未知'
                });
            });

            if (files.length > 10) {
                console.log(`... 還有 ${files.length - 10} 個檔案未顯示`);
            }

            return files;
        } catch (error) {
            console.error('❌ 檢查根目錄失敗:', error);
            throw error;
        }
    }
}

// 提供一個簡單的檢查函數供開發者使用
export const checkDriveFiles = async () => {
    console.log('🚀 開始全面檢查 Google Drive 檔案...');
    
    try {
        // 1. 檢查根目錄
        console.log('\n=== 1. 檢查根目錄 ===');
        await DriveFileChecker.checkRootDirectory();
        
        // 2. 檢查所有交易相關檔案
        console.log('\n=== 2. 檢查所有交易相關檔案 ===');
        await DriveFileChecker.checkAllTransactionFiles();
        
        // 3. 檢查新的區塊鏈檔案
        console.log('\n=== 3. 檢查新的區塊鏈檔案 ===');
        await DriveFileChecker.checkBlockchainFiles();
        
        console.log('\n✅ 檢查完成！');
        
    } catch (error) {
        console.error('❌ 檢查過程中發生錯誤:', error);
    }
};
