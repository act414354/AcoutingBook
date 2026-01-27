/// <reference types="gapi.client.drive-v3" />
import { gapi } from 'gapi-script';
import { GOOGLE_CONFIG } from '../config/google';

export const initGoogleClient = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
        gapi.load('client:auth2', async () => {
            try {
                await gapi.client.init({
                    apiKey: GOOGLE_CONFIG.API_KEY,
                    clientId: GOOGLE_CONFIG.CLIENT_ID,
                    discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS,
                    scope: GOOGLE_CONFIG.SCOPES,
                });
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
};

export const signIn = async (): Promise<gapi.auth2.GoogleUser> => {
    const authInstance = gapi.auth2.getAuthInstance();
    return authInstance.signIn();
};

export const signOut = async (): Promise<void> => {
    const authInstance = gapi.auth2.getAuthInstance();
    return authInstance.signOut();
};

export const listFiles = async (query: string = ""): Promise<gapi.client.drive.File[]> => {
    try {
        const response = await gapi.client.drive.files.list({
            'pageSize': 100,
            'fields': "nextPageToken, files(id, name, parents, createdTime)",
            'q': query || "trashed = false"
        });
        return response.result.files || [];
    } catch (error) {
        console.error("Error listing files", error);
        throw error;
    }
};

export const createFile = async (name: string, content: string, parents: string[] = []): Promise<gapi.client.drive.File> => {
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const contentType = 'application/json';
    const metadata = {
        name,
        mimeType: contentType,
        parents
    };

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + contentType + '\r\n\r\n' +
        content +
        close_delim;

    const request = gapi.client.request({
        'path': '/upload/drive/v3/files',
        'method': 'POST',
        'params': { 'uploadType': 'multipart' },
        'headers': {
            'Content-Type': 'multipart/related; boundary="' + boundary + '"'
        },
        'body': multipartRequestBody
    });

    return new Promise((resolve, reject) => {
        request.execute((file: any) => { // using any because gapi types might vary slightly on request response
            if (file.error) {
                reject(file.error);
            } else {
                resolve(file);
            }
        });
    });
};
