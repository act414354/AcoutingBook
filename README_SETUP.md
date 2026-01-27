# QuickBook - 簡化設定指南

## 🚀 超簡單設定 (3步驟完成)

### 步驟 1: 複製環境變數檔案
```bash
cp .env.example .env
```

### 步驟 2: 取得 Google API 憑證
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 **Google Drive API**
4. 建立憑證：
   - 點選「憑證」→「建立憑證」→「OAuth 2.0 用戶端 ID」
   - 選擇「網頁應用程式」
   - 授權的 JavaScript 來源：`http://localhost:5173`
   - 授權的重新導向 URI：`http://localhost:5173`
5. 建立 API 金鑰：
   - 點選「憑證」→「建立憑證」→「API 金鑰」
1097694028001-5q4132avb5uldunficsbd22hvlk8qrs5.apps.googleusercontent.com
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

### 步驟 3: 填入環境變數
編輯 `.env` 檔案：
```env
VITE_GOOGLE_CLIENT_ID=你的用戶端ID.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=你的API金鑰
```

## 🎯 特色功能

### ✨ 超簡單登入
- 一鍵 Google 登入
- 自動建立資料檔案
- 無需複雜設定

### 📱 多裝置同步
- 資料儲存在您的 Google Drive
- 自動同步所有裝置
- 離線也可使用

### 🔒 隱私保護
- 資料只存在您的 Google Drive
- 我們無法存取您的資料
- 完全去中心化

## 🚀 啟動應用程式

```bash
npm install
npm run dev
```

應用程式將在 `http://localhost:5173` 啟動

## 📁 資料儲存位置

您的會計資料會儲存在 Google Drive 的「應用程式專用資料夾」中：
- 檔案名稱：`accounting_data.json`
- 位置：`appDataFolder` (只有此應用程式能存取)
- 格式：JSON 格式，可隨時匯出

## 🔧 故障排除

### 登入失敗？
- 檢查 `.env` 檔案中的憑證是否正確
- 確認 Google Cloud Console 中的設定
- 確保已啟用 Google Drive API

### 資料同步問題？
- 檢查網路連線
- 重新登入可強制同步
- 資料會自動備份到 Google Drive

## 🎉 開始使用

設定完成後，您就可以：
1. 點選「Sign In with Google」登入
2. 自動建立個人資料檔案
3. 在任何裝置上登入同步資料
4. 開始記錄您的會計資料

就是这么簡單！🎊
