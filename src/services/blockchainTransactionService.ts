import { gapi } from 'gapi-script';
import { simpleDriveService } from './simpleDrive';

// 區塊鏈交易格式接口
export interface BlockchainTransaction {
    tx_id: string;
    time: string;
    type: string;
    category: string;
    debit?: {
        account: string;
        amount: number;
        currency: string;
    };
    credit?: {
        account: string;
        amount: number;
        currency: string;
    };
    note: string;
    tx_hash: string;
}

export interface BlockHeader {
    version: string;
    date: string;
    block_height: number;
    prev_block_hash: string;
    transaction_count: number;
    exchange_rates: {
        base_currency: string;
        rates: Record<string, number>;
        source: string;
    };
    balances_snapshot: Record<string, { amount: number; currency: string }>;
}

export interface BlockData {
    block_header: BlockHeader;
    transactions: BlockchainTransaction[];
    block_signature: {
        hash: string;
        signed_by: string;
    };
}

class BlockchainTransactionService {
    private currentBlockHeight = 0;
    private prevBlockHash = 'genesis';

    // 生成檔案名稱：YYYYMMDD_使用者帳戶名(忽略空格)_雜湊值.json
    // 同一天內使用相同的雜湊值，確保能找到現有檔案
    async generateFileName(date: string, userAccountName: string): Promise<string> {
        const formattedDate = date.replace(/-/g, '');
        const cleanAccountName = userAccountName.replace(/\s+/g, ''); // 移除所有空格
        
        // 使用日期和用戶名生成固定雜湊，確保同一天內檔名一致
        const hashInput = `${formattedDate}_${cleanAccountName}`;
        const hash = this.generateFixedHash(hashInput);
        
        return `${formattedDate}_${cleanAccountName}_${hash}.json`;
    }

    // 生成固定雜湊值（基於輸入字符串）
    private generateFixedHash(input: string): string {
        // 使用 UTF-8 安全的編碼方式
        const encoder = new TextEncoder();
        const data = encoder.encode(input);
        const hashArray = Array.from(data);
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex.substring(0, 16);
    }

    // 生成交易雜湊
    generateTransactionHash(tx: BlockchainTransaction): string {
        const txString = JSON.stringify(tx);
        // 使用 UTF-8 安全的編碼方式
        const encoder = new TextEncoder();
        const data = encoder.encode(txString);
        const hashArray = Array.from(data);
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex.substring(0, 16);
    }

    // 生成區塊雜湊
    generateBlockHash(blockData: BlockData): string {
        const blockString = JSON.stringify(blockData);
        // 使用 UTF-8 安全的編碼方式
        const encoder = new TextEncoder();
        const data = encoder.encode(blockString);
        const hashArray = Array.from(data);
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex.substring(0, 16);
    }

    // 獲取當前匯率（模擬）
    async getCurrentExchangeRates(): Promise<BlockHeader['exchange_rates']> {
        // 這裡可以整合真實的匯率 API
        return {
            base_currency: 'TWD',
            rates: {
                'USD': 32.55,
                'JPY': 0.215,
                'EUR': 35.12
            },
            source: 'Bank of Taiwan / Open API'
        };
    }

    // 獲取當前帳戶餘額快照
    async getBalancesSnapshot(): Promise<BlockHeader['balances_snapshot']> {
        const snapshot = simpleDriveService.getCurrentSnapshot();
        const balances: BlockHeader['balances_snapshot'] = {};
        
        // 獲取所有帳戶設置
        const settings = await simpleDriveService.getSettings();
        const allAccounts = settings.accounts || [];
        
        // 轉換快照格式 - 包含所有帳戶（包括餘額為0的）
        Object.entries(snapshot.accounts).forEach(([accountId, currencies]) => {
            Object.entries(currencies).forEach(([currency, amount]) => {
                // 包含所有餘額，包括0
                balances[accountId] = { amount, currency };
            });
        });
        
        // 確保所有設置中的帳戶都被包含（即使餘額為0）
        allAccounts.forEach((account: any) => {
            if (!balances[account.id] && !account.deleted) {
                balances[account.id] = { amount: 0, currency: account.currency || 'TWD' };
            }
        });

        return balances;
    }

    // 轉換交易類型（記錄時使用英文）
    convertTransactionType(type: string): string {
        // 直接返回英文類型，不轉換為中文
        const validTypes = ['expense', 'income', 'transfer', 'exchange'];
        return validTypes.includes(type) ? type : 'expense'; // 預設為 expense
    }

    // 獲取使用者帳戶名稱
    getUserAccountName(): string {
        // 從 simpleDriveService 獲取用戶信息
        const user = simpleDriveService.getUser();
        if (user && user.name) {
            return user.name.replace(/\s+/g, ''); // 直接移除空格
        }
        return 'UnknownUser'; // 預設值，也移除空格
    }

    // 獲取帳戶名稱（用於顯示）
    getAccountName(accountId: string): string {
        const accountMap: Record<string, string> = {
            '001_cash_cash': '現金錢包',
            '002_bank_bank': '銀行帳戶',
            '003_bank_credit': '信用卡',
            '004_investment_stock': '證券',
            '005_crypto_crypto': '加密貨幣',
            '006_bank_savings': '儲蓄帳戶'
        };
        return accountMap[accountId] || accountId;
    }

    // 獲取帳戶ID（確保保存時使用ID而不是顯示名稱）
    private getAccountIdForSave(accountIdentifier: string): string {
        // 如果已經是ID格式，直接返回
        if (/^\d{3}_[a-z]+_[a-z]+$/.test(accountIdentifier)) {
            return accountIdentifier;
        }
        
        // 如果是顯示名名稱，轉換為ID
        const nameToIdMap: Record<string, string> = {
            '現金錢包': '001_cash_cash',
            'cash': '001_cash_cash',
            '銀行帳戶': '002_bank_bank',
            'bank': '002_bank_bank',
            '信用卡': '003_bank_credit',
            'credit': '003_bank_credit',
            '證券': '004_investment_stock',
            'stock': '004_investment_stock',
            '加密貨幣': '005_crypto_crypto',
            'crypto': '005_crypto_crypto',
            '儲蓄帳戶': '006_bank_savings',
            'savings': '006_bank_savings'
        };
        
        return nameToIdMap[accountIdentifier] || accountIdentifier;
    }

    // 將 TransactionForm 數據轉換為區塊鏈格式
    async convertToBlockchainFormat(
        type: string,
        amount: number,
        category: string,
        note: string,
        accountId: string,
        options?: {
            currency?: string;
            toAccountId?: string;
            targetCurrency?: string;
            exchangeRate?: number;
            targetAmount?: number;
            date?: number;
        }
    ): Promise<BlockData> {
        const date = new Date(options?.date || Date.now());
        const dateStr = date.toISOString().split('T')[0];
        
        // 生成簡單的交易ID，不包含時間
        const txId = `tx_${dateStr.replace(/-/g, '')}_${String(Math.random()).substring(2, 8)}`;

        const transactions: BlockchainTransaction[] = [];

        // 確保使用帳戶ID而不是顯示名稱
        const sourceAccountId = this.getAccountIdForSave(accountId);
        const targetAccountId = options?.toAccountId ? this.getAccountIdForSave(options.toAccountId) : '';

        if (type === 'transfer' || type === 'exchange') {
            // 轉帳或換匯交易
            const tx: BlockchainTransaction = {
                tx_id: txId,
                time: '', // 不再使用時間
                type: this.convertTransactionType(type),
                category: category,
                debit: {
                    account: sourceAccountId,
                    amount: amount,
                    currency: options?.currency || 'TWD'
                },
                credit: {
                    account: targetAccountId,
                    amount: options?.targetAmount || amount,
                    currency: options?.targetCurrency || 'TWD'
                },
                note: note,
                tx_hash: '' // 先設為空，後面生成
            };
            tx.tx_hash = this.generateTransactionHash(tx);
            transactions.push(tx);
        } else {
            // 收入或支出交易
            const isIncome = type === 'income';
            const tx: BlockchainTransaction = {
                tx_id: txId,
                time: '', // 不再使用時間
                type: this.convertTransactionType(type),
                category: category,
                debit: isIncome ? undefined : {
                    account: sourceAccountId,
                    amount: amount,
                    currency: options?.currency || 'TWD'
                },
                credit: isIncome ? {
                    account: sourceAccountId,
                    amount: amount,
                    currency: options?.currency || 'TWD'
                } : undefined,
                note: note,
                tx_hash: '' // 先設為空，後面生成
            };
            tx.tx_hash = this.generateTransactionHash(tx);
            transactions.push(tx);
        }

        // 創建區塊頭
        const blockHeader: BlockHeader = {
            version: '1.0',
            date: dateStr,
            block_height: this.currentBlockHeight,
            prev_block_hash: this.prevBlockHash,
            transaction_count: transactions.length,
            exchange_rates: await this.getCurrentExchangeRates(),
            balances_snapshot: await this.getBalancesSnapshot()
        };

        // 創建區塊數據
        const blockData: BlockData = {
            block_header: blockHeader,
            transactions: transactions,
            block_signature: {
                hash: '',
                signed_by: 'user_private_key_id'
            }
        };

        // 生成區塊雜湊
        blockData.block_signature.hash = this.generateBlockHash(blockData);

        return blockData;
    }

    // 更新區塊信息
    private async updateBlockInfo(): Promise<void> {
        try {
            // 獲取最新的區塊高度和雜湊
            const history = await simpleDriveService.getHistory(1);
            if (history.length > 0) {
                const latestBlock = history[0];
                this.currentBlockHeight = (latestBlock.timestamp || Date.now()) % 10000; // 簡化的區塊高度計算
                this.prevBlockHash = latestBlock.id || 'genesis';
            } else {
                this.currentBlockHeight = 1;
                this.prevBlockHash = 'genesis';
            }
        } catch (error) {
            console.warn('Failed to update block info:', error);
            this.currentBlockHeight = 1;
            this.prevBlockHash = 'genesis';
        }
    }

    // 確保或創建 QuickBook Data 資料夾
    private async ensureQuickBookDataFolder(): Promise<string> {
        try {
            // 搜尋 QuickBook Data 資料夾
            const query = "name='QuickBook Data' and mimeType='application/vnd.google-apps.folder' and trashed=false";
            const response = await gapi.client.drive.files.list({
                q: query,
                fields: 'files(id, name)'
            });

            const folders = response.result.files || [];
            if (folders.length > 0) {
                const folderId = folders[0].id || '';
                console.log('✅ 找到 QuickBook Data 資料夾:', folderId);
                return folderId;
            }

            // 創建 QuickBook Data 資料夾
            console.log('📁 創建 QuickBook Data 資料夾...');
            const createResponse = await gapi.client.drive.files.create({
                resource: {
                    name: 'QuickBook Data',
                    mimeType: 'application/vnd.google-apps.folder'
                },
                fields: 'id'
            });

            const folderId = createResponse.result.id || '';
            console.log('✅ QuickBook Data 資料夾創建成功:', folderId);
            return folderId;
        } catch (error) {
            console.error('❌ 創建/查找 QuickBook Data 資料夾失敗:', error);
            throw error;
        }
    }

    // 重命名檔案
    private async renameFile(fileId: string, newName: string): Promise<void> {
        try {
            await gapi.client.drive.files.update({
                fileId: fileId,
                resource: {
                    name: newName
                }
            });
        } catch (error) {
            console.error('❌ 重命名檔案失敗:', error);
            throw error;
        }
    }

    // 檢查或創建每日交易檔案
    private async findOrCreateDailyFile(date: string, userAccountName: string): Promise<{ fileId: string; blockData: BlockData }> {
        const fileName = await this.generateFileName(date, userAccountName);
        const folderId = await this.ensureQuickBookDataFolder();

        console.log(`🔍 檢查當日交易檔案: ${fileName}`);
        console.log(`📅 日期: ${date}, 用戶: ${userAccountName}`);

        try {
            // 步驟1: 首先搜尋新格式的檔案
            const newFormatQuery = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
            const response = await gapi.client.drive.files.list({
                q: newFormatQuery,
                fields: 'files(id, name, createdTime, modifiedTime)'
            });

            const files = response.result.files || [];
            
            if (files.length > 0) {
                // 步驟2: 找到新格式檔案，讀取現有內容
                const fileId = files[0].id || '';
                const fileInfo = files[0];
                console.log(`✅ 找到現有的每日交易檔案: ${fileName}`);
                console.log(`📁 檔案ID: ${fileId}, 創建時間: ${fileInfo.createdTime}, 修改時間: ${fileInfo.modifiedTime}`);
                console.log(`🎯 同一天的交易將添加到現有檔案中，不會創建新檔案`);
                
                const contentResponse = await gapi.client.drive.files.get({
                    fileId: fileId,
                    alt: 'media'
                });
                
                const existingData = contentResponse.result as BlockData;
                console.log(`📖 讀取現有交易數據，現有交易數量: ${existingData.transactions.length}`);
                console.log(`📋 現有交易類型: ${existingData.transactions.map(tx => tx.type).join(', ')}`);
                
                return { fileId, blockData: existingData };
            }

            // 步驟3: 如果沒找到新格式，搜尋舊格式的檔案
            const cleanAccountName = userAccountName.replace(/\s+/g, '');
            const oldFileName = `${date}_${cleanAccountName}.json`; // 舊格式: YYYY-MM-DD_Username.json
            
            const oldFormatQuery = `name='${oldFileName}' and '${folderId}' in parents and trashed=false`;
            const oldResponse = await gapi.client.drive.files.list({
                q: oldFormatQuery,
                fields: 'files(id, name, createdTime, modifiedTime)'
            });

            const oldFiles = oldResponse.result.files || [];
            
            if (oldFiles.length > 0) {
                // 步驟4: 找到舊格式檔案，讀取並升級
                const fileId = oldFiles[0].id || '';
                const fileInfo = oldFiles[0];
                console.log(`🔄 找到舊格式交易檔案: ${oldFileName}`);
                console.log(`📁 檔案ID: ${fileId}, 創建時間: ${fileInfo.createdTime}, 修改時間: ${fileInfo.modifiedTime}`);
                console.log(`🔄 將讀取舊檔案並使用新格式保存`);
                
                const contentResponse = await gapi.client.drive.files.get({
                    fileId: fileId,
                    alt: 'media'
                });
                
                const existingData = contentResponse.result as BlockData;
                console.log(`📖 讀取舊格式交易數據，現有交易數量: ${existingData.transactions.length}`);
                console.log(`📋 現有交易類型: ${existingData.transactions.map(tx => tx.type).join(', ')}`);
                
                // 將舊檔案重命名為新格式
                await this.renameFile(fileId, fileName);
                console.log(`🔄 檔案已重命名為新格式: ${fileName}`);
                
                return { fileId, blockData: existingData };
            } else {
                // 步驟3: 檔案不存在，創建新的每日交易檔案
                console.log(`📝 當日檔案不存在，開始創建新檔案: ${fileName}`);
                console.log(`🆕 這是當天的第一筆交易，將創建新的每日交易檔案`);
                return await this.createNewDailyFile(fileName, folderId, date);
            }
        } catch (error) {
            console.error('❌ 檢查現有檔案時發生錯誤:', error);
            console.log('📝 嘗試創建新檔案作為備選方案');
            return await this.createNewDailyFile(fileName, folderId, date);
        }
    }

    // 創建新的每日交易檔案
    private async createNewDailyFile(fileName: string, folderId: string, date: string): Promise<{ fileId: string; blockData: BlockData }> {
        console.log(`🆕 創建新的每日交易檔案: ${fileName}`);
        
        const newBlockData: BlockData = {
            block_header: {
                version: '1.0',
                date: date,
                block_height: this.currentBlockHeight,
                prev_block_hash: this.prevBlockHash,
                transaction_count: 0,
                exchange_rates: await this.getCurrentExchangeRates(),
                balances_snapshot: await this.getBalancesSnapshot()
            },
            transactions: [],
            block_signature: {
                hash: '',
                signed_by: 'user_private_key_id'
            }
        };

        // 創建新檔案
        const metadata = {
            name: fileName,
            parents: [folderId],
            properties: {
                type: 'daily_transaction_block',
                date: date,
                user: this.getUserAccountName()
            }
        };

        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(newBlockData, null, 2) +
            close_delim;

        // @ts-ignore
        const tokenObj = gapi.client.getToken();
        if (!tokenObj || !tokenObj.access_token) {
            throw new Error("無法獲取 access token");
        }
        const accessToken = tokenObj.access_token;

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary="${boundary}"`
            },
            body: multipartRequestBody
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `創建檔案失敗，狀態碼: ${response.status}`);
        }

        const result = await response.json();
        const fileId = result.id || '';
        console.log(`✅ 新的每日交易檔案創建成功: ${fileId}`);
        
        return { fileId, blockData: newBlockData };
    }

    // 更新現有檔案
    private async updateExistingFile(fileId: string, blockData: BlockData): Promise<void> {
        // 重新生成區塊雜湊
        blockData.block_signature.hash = this.generateBlockHash(blockData);
        blockData.block_header.transaction_count = blockData.transactions.length;

        // @ts-ignore
        const tokenObj = gapi.client.getToken();
        if (!tokenObj || !tokenObj.access_token) {
            throw new Error("無法獲取 access token");
        }
        const accessToken = tokenObj.access_token;

        // 生成正確的檔名格式：YYYYMMDD_Username_Hash.json
        const fileName = await this.generateFileName(blockData.block_header.date, this.getUserAccountName());
        
        const metadata = {
            name: fileName,
            properties: {
                type: 'daily_transaction_block',
                date: blockData.block_header.date,
                user: this.getUserAccountName(),
                last_updated: new Date().toISOString()
            }
        };

        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(blockData, null, 2) +
            close_delim;

        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary="${boundary}"`
            },
            body: multipartRequestBody
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `更新檔案失敗，狀態碼: ${response.status}`);
        }

        console.log('✅ 每日交易檔案更新成功');
    }

    // 保存區塊到 Google Drive (每日檔案模式)
    async saveBlockToDrive(blockData: BlockData, accountName: string, transactionType: string): Promise<string> {
        const date = blockData.block_header.date;
        const userAccountName = this.getUserAccountName();

        try {
            console.log(`📁 開始保存每日交易檔案: ${date} - ${userAccountName}`);
            console.log(`📝 新增交易類型: ${transactionType}, 數量: ${blockData.transactions.length}`);
            
            // 檢查是否已登入
            if (!simpleDriveService.isSignedIn()) {
                throw new Error('用戶未登入，無法保存到 Google Drive');
            }

            // 步驟1: 檢查或創建每日交易檔案
            const { fileId, blockData: existingBlockData } = await this.findOrCreateDailyFile(date, userAccountName);

            // 步驟2: 添加新交易到現有檔案
            const newTransaction = blockData.transactions[0]; // 假設每次只添加一筆交易
            
            // 檢查是否已經有相同的交易（避免重複添加）
            const isDuplicate = existingBlockData.transactions.some(existingTx => 
                existingTx.tx_id === newTransaction.tx_id ||
                (existingTx.time === newTransaction.time && 
                 existingTx.type === newTransaction.type &&
                 existingTx.note === newTransaction.note)
            );
            
            if (isDuplicate) {
                console.log(`⚠️ 發現重複交易，跳過添加: ${newTransaction.tx_id}`);
                console.log(`📊 重複交易詳情: ${newTransaction.type} ${newTransaction.note}`);
                return fileId; // 返回現有檔案ID，但不添加重複交易
            }
            
            existingBlockData.transactions.push(newTransaction);

            console.log(`➕ 添加新交易到檔案，總交易數量: ${existingBlockData.transactions.length}`);
            console.log(`🆔 新交易ID: ${newTransaction.tx_id}, 類型: ${newTransaction.type}, 備註: ${newTransaction.note}`);

            // 步驟3: 更新區塊頭信息
            existingBlockData.block_header.transaction_count = existingBlockData.transactions.length;
            existingBlockData.block_header.exchange_rates = await this.getCurrentExchangeRates();
            
            // 簡化快照計算：直接從現有快照獲取
            const currentSnapshot = simpleDriveService.getCurrentSnapshot();
            const balances: BlockHeader['balances_snapshot'] = {};
            
            // 獲取所有帳戶設置
            const settings = await simpleDriveService.getSettings();
            const allAccounts = settings.accounts || [];
            
            // 從當前快照轉換
            Object.entries(currentSnapshot.accounts).forEach(([accountId, currencies]) => {
                Object.entries(currencies).forEach(([currency, amount]) => {
                    balances[accountId] = { amount, currency };
                });
            });
            
            // 確保所有設置中的帳戶都被包含
            allAccounts.forEach((account: any) => {
                if (!balances[account.id] && !account.deleted) {
                    balances[account.id] = { amount: 0, currency: 'TWD' };
                }
            });
            
            existingBlockData.block_header.balances_snapshot = balances;

            // 步驟4: 更新檔案
            await this.updateExistingFile(fileId, existingBlockData);

            console.log('✅ 每日交易檔案更新成功:', {
                fileId,
                date,
                user: userAccountName,
                totalTransactions: existingBlockData.transactions.length,
                lastTransactionType: transactionType
            });
            
            return fileId;
        } catch (error) {
            console.error("❌ 保存每日交易檔案失敗:", error);
            
            if (error instanceof Error) {
                console.error('錯誤詳情:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
            }
            
            throw error;
        }
    }

    // 主要的保存交易方法
    async saveTransaction(
        type: string,
        amount: number,
        category: string,
        note: string,
        accountId: string,
        options?: {
            currency?: string;
            toAccountId?: string;
            targetCurrency?: string;
            exchangeRate?: number;
            targetAmount?: number;
            date?: number;
        }
    ): Promise<string> {
        try {
            console.log('🔄 開始保存交易:', { type, amount, category, note, accountId, options });
            
            // 1. 檢查是否有舊資料
            const date = new Date(options?.date || Date.now());
            const dateStr = date.toISOString().split('T')[0];
            const userAccountName = this.getUserAccountName();
            
            const { fileId, blockData: existingBlockData } = await this.findOrCreateDailyFile(dateStr, userAccountName);
            
            let blockData: BlockData;
            let isNewFile = false;
            
            if (existingBlockData.transactions.length > 0) {
                // 2. 有舊資料 → 讀取並計算快照
                console.log('📁 找到舊資料，開始計算快照');
                blockData = existingBlockData;
                
                // 計算當前快照
                const currentSnapshot = await this.calculateSnapshotFromTransactions(blockData.transactions);
                
                // 3. 計算新交易後的餘額
                const newSnapshot = await this.calculateNewTransactionSnapshot(currentSnapshot, type, amount, accountId, options);
                
                // 4. 更新快照
                blockData.block_header.balances_snapshot = this.convertSnapshotToBlockFormat(newSnapshot);
                
            } else {
                // 5. 沒有舊資料 → 直接創建新資料
                console.log('🆕 沒有舊資料，創建新資料');
                blockData = await this.createNewBlockData(dateStr, type, amount, category, note, accountId, options);
                isNewFile = true;
            }
            
            // 6. 創建新交易
            const newTransaction = await this.createNewTransaction(type, amount, category, note, accountId, options);
            
            // 7. 添加交易並按 tx_id 流水號排序
            blockData.transactions.push(newTransaction);
            blockData.transactions.sort((a, b) => {
                const numA = parseInt(a.tx_id.split('_').pop() || '0');
                const numB = parseInt(b.tx_id.split('_').pop() || '0');
                return numA - numB; // 按流水號順序排列
            });
            
            // 8. 更新區塊頭信息
            blockData.block_header.transaction_count = blockData.transactions.length;
            blockData.block_header.exchange_rates = await this.getCurrentExchangeRates();
            
            // 9. 保存檔案
            if (isNewFile) {
                await this.updateExistingFile(fileId, blockData);
            } else {
                await this.updateExistingFile(fileId, blockData);
            }
            
            console.log('✅ 交易保存成功:', fileId);
            return fileId;
            
        } catch (error) {
            console.error('❌ 保存交易失敗:', error);
            throw error;
        }
    }
    
    // 計算交易快照
    private async calculateSnapshotFromTransactions(transactions: BlockchainTransaction[]): Promise<any> {
        const snapshot: any = { totalAssets: {}, accounts: {} };
        
        // 先獲取所有帳戶設置，確保所有帳戶都顯示在快照中
        const settings = await simpleDriveService.getSettings();
        const allAccounts = settings.accounts || [];
        
        // 初始化所有帳戶的快照
        allAccounts.forEach((account: any) => {
            if (!account.deleted) {
                snapshot.accounts[account.id] = {
                    TWD: 0, // 預設 TWD 餘額為 0
                    USD: 0, // 預設 USD 餘額為 0
                    JPY: 0, // 預設 JPY 餘額為 0
                    EUR: 0  // 預設 EUR 餘額為 0
                };
            }
        });
        
        // 按流水號排序處理交易
        const sortedTransactions = [...transactions].sort((a, b) => {
            const numA = parseInt(a.tx_id.split('_').pop() || '0');
            const numB = parseInt(b.tx_id.split('_').pop() || '0');
            return numA - numB; // 從舊到新
        });
        
        // 處理交易，更新快照
        sortedTransactions.forEach(tx => {
            if (tx.debit) {
                const accountId = tx.debit.account;
                const currency = tx.debit.currency;
                const amount = tx.debit.amount;
                
                if (!snapshot.accounts[accountId]) {
                    snapshot.accounts[accountId] = {};
                }
                snapshot.accounts[accountId][currency] = (snapshot.accounts[accountId][currency] || 0) - amount;
                snapshot.totalAssets[currency] = (snapshot.totalAssets[currency] || 0) - amount;
            }
            
            if (tx.credit) {
                const accountId = tx.credit.account;
                const currency = tx.credit.currency;
                const amount = tx.credit.amount;
                
                if (!snapshot.accounts[accountId]) {
                    snapshot.accounts[accountId] = {};
                }
                snapshot.accounts[accountId][currency] = (snapshot.accounts[accountId][currency] || 0) + amount;
                snapshot.totalAssets[currency] = (snapshot.totalAssets[currency] || 0) + amount;
            }
        });
        
        return snapshot;
    }
    
    // 計算新交易後的快照
    private async calculateNewTransactionSnapshot(currentSnapshot: any, type: string, amount: number, accountId: string, options?: any): Promise<any> {
        const newSnapshot = JSON.parse(JSON.stringify(currentSnapshot));
        const currency = options?.currency || 'TWD';
        
        // 確保所有帳戶都存在於快照中
        const settings = await simpleDriveService.getSettings();
        const allAccounts = settings.accounts || [];
        
        allAccounts.forEach((account: any) => {
            if (!account.deleted && !newSnapshot.accounts[account.id]) {
                newSnapshot.accounts[account.id] = {
                    TWD: 0,
                    USD: 0,
                    JPY: 0,
                    EUR: 0
                };
            }
        });
        
        // 確保目標帳戶存在
        if (!newSnapshot.accounts[accountId]) {
            newSnapshot.accounts[accountId] = {
                TWD: 0,
                USD: 0,
                JPY: 0,
                EUR: 0
            };
        }
        
        if (type === 'income') {
            newSnapshot.accounts[accountId][currency] = (newSnapshot.accounts[accountId][currency] || 0) + amount;
            newSnapshot.totalAssets[currency] = (newSnapshot.totalAssets[currency] || 0) + amount;
        } else if (type === 'expense') {
            newSnapshot.accounts[accountId][currency] = (newSnapshot.accounts[accountId][currency] || 0) - amount;
            newSnapshot.totalAssets[currency] = (newSnapshot.totalAssets[currency] || 0) - amount;
        } else if (type === 'transfer') {
            const toAccountId = options?.toAccountId;
            if (toAccountId) {
                const targetCurrency = options?.targetCurrency || currency;
                const targetAmount = options?.targetAmount || amount;
                
                // 確保目標帳戶存在
                if (!newSnapshot.accounts[toAccountId]) {
                    newSnapshot.accounts[toAccountId] = {
                        TWD: 0,
                        USD: 0,
                        JPY: 0,
                        EUR: 0
                    };
                }
                
                newSnapshot.accounts[accountId][currency] = (newSnapshot.accounts[accountId][currency] || 0) - amount;
                newSnapshot.totalAssets[currency] = (newSnapshot.totalAssets[currency] || 0) - amount;
                
                newSnapshot.accounts[toAccountId][targetCurrency] = (newSnapshot.accounts[toAccountId][targetCurrency] || 0) + targetAmount;
                newSnapshot.totalAssets[targetCurrency] = (newSnapshot.totalAssets[targetCurrency] || 0) + targetAmount;
            }
        }
        
        return newSnapshot;
    }
    
    // 轉換快照為區塊格式
    private convertSnapshotToBlockFormat(snapshot: any): BlockHeader['balances_snapshot'] {
        const balances: BlockHeader['balances_snapshot'] = {};
        
        Object.entries(snapshot.accounts).forEach(([accountId, currencies]: [string, any]) => {
            // 每個帳戶的每種貨幣都要記錄
            Object.entries(currencies).forEach(([currency, amount]) => {
                // 使用 accountId_currency 作為 key 來區分不同貨幣
                const key = `${accountId}_${currency}`;
                balances[key] = { amount, currency };
            });
        });
        
        return balances;
    }
    
    // 創建新交易
    private async createNewTransaction(type: string, amount: number, category: string, note: string, accountId: string, options?: any): Promise<BlockchainTransaction> {
        const date = new Date(options?.date || Date.now());
        const dateStr = date.toISOString().split('T')[0];
        
        // 獲取現有交易數量來生成流水號
        const userAccountName = this.getUserAccountName();
        const { blockData: existingBlockData } = await this.findOrCreateDailyFile(dateStr, userAccountName);
        const nextSequenceNumber = existingBlockData.transactions.length + 1;
        
        const txId = `tx_${dateStr.replace(/-/g, '')}_${String(nextSequenceNumber).padStart(3, '0')}`;
        
        const sourceAccountId = this.getAccountIdForSave(accountId);
        const targetAccountId = options?.toAccountId ? this.getAccountIdForSave(options.toAccountId) : '';
        
        if (type === 'transfer' || type === 'exchange') {
            const tx: BlockchainTransaction = {
                tx_id: txId,
                time: '',
                type: this.convertTransactionType(type),
                category: category,
                debit: {
                    account: sourceAccountId,
                    amount: amount,
                    currency: options?.currency || 'TWD'
                },
                credit: {
                    account: targetAccountId,
                    amount: options?.targetAmount || amount,
                    currency: options?.targetCurrency || 'TWD'
                },
                note: note,
                tx_hash: ''
            };
            tx.tx_hash = this.generateTransactionHash(tx);
            return tx;
        } else {
            const isIncome = type === 'income';
            const tx: BlockchainTransaction = {
                tx_id: txId,
                time: '',
                type: this.convertTransactionType(type),
                category: category,
                debit: isIncome ? undefined : {
                    account: sourceAccountId,
                    amount: amount,
                    currency: options?.currency || 'TWD'
                },
                credit: isIncome ? {
                    account: sourceAccountId,
                    amount: amount,
                    currency: options?.currency || 'TWD'
                } : undefined,
                note: note,
                tx_hash: ''
            };
            tx.tx_hash = this.generateTransactionHash(tx);
            return tx;
        }
    }
    
    // 創建新區塊數據
    private async createNewBlockData(dateStr: string, type: string, amount: number, category: string, note: string, accountId: string, options?: any): Promise<BlockData> {
        // 創建初始快照
        const snapshot: any = { totalAssets: {}, accounts: {} };
        
        // 計算新交易的快照
        const newSnapshot = await this.calculateNewTransactionSnapshot(snapshot, type, amount, accountId, options);
        
        return {
            block_header: {
                version: '1.0',
                date: dateStr,
                block_height: this.currentBlockHeight,
                prev_block_hash: this.prevBlockHash,
                transaction_count: 0,
                exchange_rates: await this.getCurrentExchangeRates(),
                balances_snapshot: this.convertSnapshotToBlockFormat(newSnapshot)
            },
            transactions: [],
            block_signature: {
                hash: '',
                signed_by: ''
            }
        };
    }
}

export const blockchainTransactionService = new BlockchainTransactionService();
