import { blockchainTransactionService } from '../services/blockchainTransactionService';

// 測試區塊鏈交易保存功能
export const testBlockchainTransaction = async () => {
    console.log('🧪 開始測試區塊鏈交易保存功能...');

    try {
        // 測試 1: 支出交易
        console.log('📝 測試支出交易...');
        const expenseResult = await blockchainTransactionService.saveTransaction(
            'expense',
            100,
            '餐飲',
            '晚餐測試',
            'acc_cash',
            {
                currency: 'TWD',
                date: Date.now()
            }
        );
        console.log('✅ 支出交易保存成功:', expenseResult);

        // 測試 2: 收入交易
        console.log('📝 測試收入交易...');
        const incomeResult = await blockchainTransactionService.saveTransaction(
            'income',
            30000,
            '薪資',
            '月薪測試',
            'acc_bank',
            {
                currency: 'TWD',
                date: Date.now()
            }
        );
        console.log('✅ 收入交易保存成功:', incomeResult);

        // 測試 3: 轉帳交易
        console.log('📝 測試轉帳交易...');
        const transferResult = await blockchainTransactionService.saveTransaction(
            'transfer',
            5000,
            '轉帳',
            '銀行轉現金測試',
            'acc_bank',
            {
                currency: 'TWD',
                toAccountId: 'acc_cash',
                targetAmount: 5000,
                date: Date.now()
            }
        );
        console.log('✅ 轉帳交易保存成功:', transferResult);

        // 測試 4: 換匯交易
        console.log('📝 測試換匯交易...');
        const exchangeResult = await blockchainTransactionService.saveTransaction(
            'exchange',
            32550,
            '投資',
            '換美金測試',
            'acc_bank',
            {
                currency: 'TWD',
                toAccountId: 'acc_bank',
                targetCurrency: 'USD',
                targetAmount: 1000,
                exchangeRate: 32.55,
                date: Date.now()
            }
        );
        console.log('✅ 換匯交易保存成功:', exchangeResult);

        console.log('🎉 所有測試通過！區塊鏈交易保存功能正常工作。');
        return true;

    } catch (error) {
        console.error('❌ 測試失敗:', error);
        return false;
    }
};

// 測試檔案名稱生成
export const testFileNameGeneration = () => {
    console.log('🧪 測試檔案名稱生成...');
    
    const fileName = blockchainTransactionService.generateFileName(
        '2026-02-02',
        'JohnDoe'
    );
    
    const expected = '20260202_JohnDoe.json';
    
    if (fileName === expected) {
        console.log('✅ 檔案名稱生成測試通過:', fileName);
        return true;
    } else {
        console.error('❌ 檔案名稱生成測試失敗:', fileName, '期望:', expected);
        return false;
    }
};

// 測試交易雜湊生成
export const testTransactionHash = () => {
    console.log('🧪 測試交易雜湊生成...');
    
    const testTx = {
        tx_id: 'test_001',
        time: '14:20:00',
        type: '支出',
        category: '餐飲',
        debit: {
            account: '現金錢包',
            amount: 100,
            currency: 'TWD'
        },
        note: '測試交易',
        tx_hash: ''
    };
    
    const hash = blockchainTransactionService.generateTransactionHash(testTx);
    
    if (hash && hash.length === 16 && /^[0-9a-f]+$/.test(hash)) {
        console.log('✅ 交易雜湊生成測試通過:', hash);
        return true;
    } else {
        console.error('❌ 交易雜湊生成測試失敗:', hash);
        return false;
    }
};

// 運行所有測試
export const runAllTests = async () => {
    console.log('🚀 開始運行所有區塊鏈交易測試...');
    
    const results = {
        fileNameTest: testFileNameGeneration(),
        hashTest: testTransactionHash(),
        transactionTest: await testBlockchainTransaction()
    };
    
    const allPassed = Object.values(results).every(result => result === true);
    
    if (allPassed) {
        console.log('🎉 所有測試通過！區塊鏈交易系統準備就緒。');
    } else {
        console.error('❌ 部分測試失敗:', results);
    }
    
    return allPassed;
};
