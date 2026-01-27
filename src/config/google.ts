export const GOOGLE_CONFIG = {
    // TODO: Replace with actual Client ID from Google Cloud Console
    // Get your credentials from: https://console.cloud.google.com/
    // 1. Enable Google Drive API
    // 2. Create OAuth 2.0 Client ID (Web Application)
    // 3. Add http://localhost:5173 to authorized origins and redirect URIs
    CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com",
    API_KEY: import.meta.env.VITE_GOOGLE_API_KEY || "YOUR_API_KEY_HERE",
    SCOPES: "https://www.googleapis.com/auth/drive.file",
    DISCOVERY_DOCS: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
};
