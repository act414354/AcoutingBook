import { gapi } from 'gapi-script';
import { simpleDriveService } from './simpleDrive';
import type { BlockData, BlockHeader } from './blockchainTransactionService';

// 交易快照類型
type TransactionSnapshot = {
    totalAssets: Record<string, number>;
    accounts: Record<string, Record<string, number>>;
};

// 轉換區塊鏈交易為舊格式 Transaction
export interface DailyTransaction {
    id: string;
    timestamp: number;
    type: 'expense' | 'income' | 'transfer' | 'exchange';
    prev_id: string | null;
    payload: {
        amount: number;
        category: string;
        note: string;
        accountId: string;
        currency?: string;
        toAccountId?: string;
        targetCurrency?: string;
        exchangeRate?: number;
        targetAmount?: number;
        date?: number;
    };
    snapshot: {
        totalAssets: Record<string, number>;
        accounts: Record<string, Record<string, number>>;
    };
}

class DailyTransactionService {
    // 從 Google Drive 讀取所有每日交易檔案
    async readAllDailyFiles(): Promise<DailyTransaction[]> {
        try {
            console.log('📖 開始讀取 Google Drive 上的每日交易檔案...');
            
            // 檢查是否已登入
            if (!simpleDriveService.isSignedIn()) {
                throw new Error('用戶未登入，無法讀取檔案');
            }

            // 搜尋 QuickBook Data 資料夾
            const folderQuery = "name='QuickBook Data' and mimeType='application/vnd.google-apps.folder' and trashed=false";
            const folderResponse = await gapi.client.drive.files.list({
                q: folderQuery,
                fields: 'files(id, name)'
            });

            const folders = folderResponse.result.files || [];
            if (folders.length === 0) {
                console.log('📁 QuickBook Data 資料夾不存在');
                return [];
            }

            const folderId = folders[0].id || '';
            console.log('✅ 找到 QuickBook Data 資料夾:', folderId);

            // 搜尋所有每日交易檔案（排除 user_setting.json）
            const filesQuery = `'${folderId}' in parents and name contains '.json' and name != 'user_setting.json' and trashed=false`;
            const filesResponse = await gapi.client.drive.files.list({
                q: filesQuery,
                orderBy: 'createdTime desc',
                fields: 'files(id, name, createdTime, modifiedTime)',
                pageSize: 100
            });

            const files = filesResponse.result.files || [];
            console.log(`📁 找到 ${files.length} 個每日交易檔案`);

            const allTransactions: DailyTransaction[] = [];

            // 讀取每個檔案的內容
            for (const file of files) {
                try {
                    const fileId = file.id || '';
                    console.log(`📖 讀取檔案: ${file.name}`);
                    
                    // 檢查是否為交易檔案（根據檔名格式）
                    if (!file.name || !this.isTransactionFile(file.name)) {
                        console.log(`⏭️ 跳過非交易檔案: ${file.name}`);
                        continue;
                    }
                    
                    const contentResponse = await gapi.client.drive.files.get({
                        fileId: fileId,
                        alt: 'media'
                    });

                    const blockData = contentResponse.result as BlockData;
                    
                    // 轉換區塊鏈交易為舊格式
                    const transactions = await this.convertBlockDataToTransactions(blockData);
                    allTransactions.push(...transactions);
                    
                    console.log(`✅ ${file.name} 包含 ${transactions.length} 筆交易`);
                } catch (error) {
                    console.error(`❌ 讀取檔案 ${file.name} 失敗:`, error);
                }
            }

            // 按時間戳排序（最新的在前）
            allTransactions.sort((a, b) => b.timestamp - a.timestamp);
            
            console.log('🔍 調試 - 交易排序順序:');
            allTransactions.slice(0, 3).forEach((tx, idx) => {
                const date = new Date(tx.timestamp);
                console.log(`  ${idx + 1}. ${tx.id} - ${date.toLocaleString()} - ${tx.type} - ${tx.payload.amount}`);
            });
            
            console.log(`✅ 總共讀取 ${allTransactions.length} 筆交易`);
            return allTransactions;

        } catch (error) {
            console.error('❌ 讀取每日交易檔案失敗:', error);
            return [];
        }
    }

    // 檢查檔案是否為交易檔案
    private isTransactionFile(fileName: string): boolean {
        // 支援新的每日交易檔案格式：YYYYMMDD_Username_Hash.json
        const dailyTransactionPattern = /^\d{8}_[^_]+_[a-f0-9]{16}\.json$/;
        
        // 支援舊格式（兼容現有檔案）：YYYY-MM-DD_Username.json
        const oldDailyTransactionPattern = /^\d{4}-\d{2}-\d{2}_[^_]+\.json$/;
        
        return dailyTransactionPattern.test(fileName) || oldDailyTransactionPattern.test(fileName);
    }

    // 轉換區塊鏈快照格式為 DailyTransaction 快照格式
    private async convertBlockSnapshotToTransactionSnapshot(blockSnapshot: BlockHeader['balances_snapshot']): Promise<TransactionSnapshot> {
        console.log('🔍 調試 - 輸入的區塊快照:', blockSnapshot);
        
        const totalAssets: Record<string, number> = {};
        const accounts: Record<string, Record<string, number>> = {};

        // 轉換格式 - 現在每個帳戶可能有多種貨幣
        Object.entries(blockSnapshot).forEach(([key, balance]) => {
            const currency = (balance as any).currency;
            const amount = (balance as any).amount;
            
            // 從 key 中提取 accountId (格式: accountId_currency)
            const accountId = key.split('_').slice(0, -1).join('_');

            console.log(`📊 處理帳戶 ${accountId}: ${amount} ${currency}`);
            
            // 累計總資產
            totalAssets[currency] = (totalAssets[currency] || 0) + amount;

            // 設置帳戶餘額
            if (!accounts[accountId]) {
                accounts[accountId] = {};
            }
            accounts[accountId][currency] = amount;
        });

        // 確保所有帳戶都有所有貨幣的餘額（沒有的設為0）
        const settings = await simpleDriveService.getSettings();
        const allAccounts = settings.accounts || [];
        
        allAccounts.forEach((account: any) => {
            if (!account.deleted && !accounts[account.id]) {
                accounts[account.id] = {
                    TWD: 0,
                    USD: 0,
                    JPY: 0,
                    EUR: 0
                };
            }
        });

        const result = { totalAssets, accounts };
        console.log('🔍 調試 - 轉換後的交易快照:', result);
        return result;
    }
    private async convertBlockDataToTransactions(blockData: BlockData): Promise<DailyTransaction[]> {
        const transactions: DailyTransaction[] = [];
        const baseDate = new Date(blockData.block_header.date).getTime();
        
        // 從最終快照開始（這是正確的最終狀態）
        const finalSnapshot = await this.convertBlockSnapshotToTransactionSnapshot(blockData.block_header.balances_snapshot);
        
        // 創建快照的深拷貝，用於反向計算每筆交易前的狀態
        let runningSnapshot = JSON.parse(JSON.stringify(finalSnapshot));

        // 按 tx_id 的流水號排序（最新到最舊）
        const sortedTransactions = [...blockData.transactions].sort((a, b) => {
            // 提取 tx_id 中的數字部分進行排序
            const numA = parseInt(a.tx_id.split('_').pop() || '0');
            const numB = parseInt(b.tx_id.split('_').pop() || '0');
            return numB - numA; // 最新的交易在前
        });

        sortedTransactions.forEach((tx) => {
            // 使用 tx_id 的數字部分作為時間戳
            const idNumber = parseInt(tx.tx_id.split('_').pop() || '0');
            const timestamp = baseDate + idNumber * 1000; // 用 ID 數字作為時間差

            // 根據交易類型確定數據
            let type: 'expense' | 'income' | 'transfer' | 'exchange';
            let payload: DailyTransaction['payload'];

            if (tx.debit && tx.credit) {
                // 轉帳或換匯
                type = tx.type === 'exchange' ? 'exchange' : 'transfer';
                payload = {
                    amount: tx.debit.amount,
                    category: tx.category,
                    note: tx.note,
                    accountId: tx.debit.account,
                    currency: tx.debit.currency,
                    toAccountId: tx.credit.account,
                    targetCurrency: tx.credit.currency,
                    targetAmount: tx.credit.amount,
                    date: timestamp
                };
            } else if (tx.debit) {
                // 支出
                type = 'expense';
                payload = {
                    amount: tx.debit.amount,
                    category: tx.category,
                    note: tx.note,
                    accountId: tx.debit.account,
                    currency: tx.debit.currency,
                    date: timestamp
                };
            } else if (tx.credit) {
                // 收入
                type = 'income';
                payload = {
                    amount: tx.credit.amount,
                    category: tx.category,
                    note: tx.note,
                    accountId: tx.credit.account,
                    currency: tx.credit.currency,
                    date: timestamp
                };
            } else {
                return; // 跳過無效交易
            }

            // 當前快照就是交易後的快照
            const postTransactionSnapshot = JSON.parse(JSON.stringify(runningSnapshot));
            
            // 反向計算交易前的快照（為下一筆交易準備）
            const accountId = payload.accountId;
            const currency = payload.currency || 'TWD';
            const amount = payload.amount;
            
            if (type === 'income') {
                // 反向計算：收入減去
                runningSnapshot.accounts[accountId][currency] = (runningSnapshot.accounts[accountId][currency] || 0) - amount;
                runningSnapshot.totalAssets[currency] = (runningSnapshot.totalAssets[currency] || 0) - amount;
            } else if (type === 'expense') {
                // 反向計算：支出加回
                runningSnapshot.accounts[accountId][currency] = (runningSnapshot.accounts[accountId][currency] || 0) + amount;
                runningSnapshot.totalAssets[currency] = (runningSnapshot.totalAssets[currency] || 0) + amount;
            } else if (type === 'transfer') {
                const toAccountId = payload.toAccountId;
                if (toAccountId) {
                    const targetCurrency = payload.targetCurrency || currency;
                    const targetAmount = payload.targetAmount || amount;
                    
                    // 反向計算轉帳
                    runningSnapshot.accounts[accountId][currency] = (runningSnapshot.accounts[accountId][currency] || 0) + amount;
                    runningSnapshot.accounts[toAccountId][targetCurrency] = (runningSnapshot.accounts[toAccountId][targetCurrency] || 0) - targetAmount;
                }
            }

            const transaction: DailyTransaction = {
                id: tx.tx_id,
                timestamp,
                type,
                prev_id: null,
                payload,
                snapshot: postTransactionSnapshot // 使用交易後的快照
            };

            transactions.push(transaction);
        });

        // 最後按時間順序排序（最新到最舊）
        transactions.sort((a, b) => b.timestamp - a.timestamp);
        
        return transactions;
    }

    // 根據帳戶名稱查找帳戶ID
    private findAccountIdByName(accountName: string): string {
        const accountMap: Record<string, string> = {
            '現金錢包': '001_cash_cash',
            'cash': '001_cash_cash',
            '銀行帳戶': '002_bank_bank',
            'bank': '002_bank_bank',
            '信用卡': '003_bank_credit',
            '證券': '004_investment_stock',
            '加密貨幣': '005_crypto_crypto',
            '儲蓄帳戶': '006_bank_savings'
        };
        return accountMap[accountName] || '001_cash_cash'; // 預設為現金帳戶
    }

    // 獲取交易歷史（兼容現有接口）
    async getHistory(limit: number = 30): Promise<DailyTransaction[]> {
        const allTransactions = await this.readAllDailyFiles();
        return allTransactions.slice(0, limit);
    }

    // 獲取當前快照
    getCurrentSnapshot(): { totalAssets: Record<string, number>, accounts: Record<string, Record<string, number>> } {
        // 這裡可以實現從最新檔案讀取快照的邏輯
        return { totalAssets: {}, accounts: {} };
    }

    // 獲取帳戶餘額
    getAccountBalances(): Record<string, Record<string, number>> {
        // 這裡可以實現從最新檔案讀取餘額的邏輯
        return {};
    }
}

export const dailyTransactionService = new DailyTransactionService();
