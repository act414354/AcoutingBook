// 重置所有數據的工具
import { simpleDriveService } from '../services/simpleDrive';

export const resetAllData = async () => {
    try {
        console.log('🗑️ 開始重置所有數據...');
        
        // 1. 登出
        await simpleDriveService.signOut();
        
        // 2. 清除瀏覽器存儲
        localStorage.clear();
        sessionStorage.clear();
        
        // 3. 重新載入頁面
        window.location.reload();
        
        console.log('✅ 數據重置完成');
    } catch (error) {
        console.error('❌ 數據重置失敗:', error);
    }
};

// 在控制台中執行：resetAllData()
