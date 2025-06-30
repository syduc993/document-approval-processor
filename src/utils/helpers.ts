import { LarkApiResponse } from '../types';

export const APPROVAL_CONFIG = {
    TEMPLATE_CODE: "8838A66F-0F31-4D1E-80A9-9F067F0DCD21",
    WIDGET_IDS: {
        id: "widget17509279596670001",
        vanBanCap1: "widget17509261859370001", 
        vanBanCap2: "widget17510785727680001",
        vanBanCap3: "widget17510785743940001",
        ngayThangNamVanBan: "widget17510781139170001",
        phapNhanAtino: "widget17510781457140001",
        congTyDoiTac: "widget17510781891140001",
        mucDoUuTien: "widget17510782210020001",
        ghiChu: "widget17510782265760001",
        giaTriHopDong: "widget17510784042570001",
        giaTriThueMatBang: "widget17510784061840001",
        taiLieuDinhKem: "widget17509209728410001"
    }
};



export const SUPPORTED_DOCUMENT_TYPES = ['pdf', 'doc', 'docx'];

export const MIME_TYPES = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

export class FileHelper {
    static getMimeType(filename: string): string {
        const ext = filename.toLowerCase().split('.').pop();
        return MIME_TYPES[ext as keyof typeof MIME_TYPES] || 'application/pdf';
    }

    static isValidDocumentType(filename: string): boolean {
        const ext = filename.toLowerCase().split('.').pop();
        return SUPPORTED_DOCUMENT_TYPES.includes(ext || '');
    }

    static buildExtra(fieldID: string, fileToken: string, recordID: string, tableID: string): string {
        const extraData = {
            bitablePerm: {
                tableId: tableID,
                attachments: {
                    [fieldID]: {
                        [recordID]: [fileToken]
                    }
                }
            }
        };
        return encodeURIComponent(JSON.stringify(extraData));
    }

    static createMultipartBody(fileName: string, documentBuffer: Buffer): { body: Buffer; boundary: string } {
        const boundary = '----formdata-' + Math.random().toString(36).substring(2);
        const chunks: Buffer[] = [];
        const CRLF = '\r\n';
        const mimeType = this.getMimeType(fileName);
        
        chunks.push(Buffer.from(`--${boundary}${CRLF}`));
        chunks.push(Buffer.from(`Content-Disposition: form-data; name="name"${CRLF}${CRLF}${fileName}${CRLF}`));
        
        chunks.push(Buffer.from(`--${boundary}${CRLF}`));
        chunks.push(Buffer.from(`Content-Disposition: form-data; name="type"${CRLF}${CRLF}attachment${CRLF}`));
        
        chunks.push(Buffer.from(`--${boundary}${CRLF}`));
        chunks.push(Buffer.from(`Content-Disposition: form-data; name="content"; filename="${fileName}"${CRLF}Content-Type: ${mimeType}${CRLF}${CRLF}`));
        chunks.push(documentBuffer);
        chunks.push(Buffer.from(`${CRLF}--${boundary}--${CRLF}`));
        
        return { body: Buffer.concat(chunks), boundary };
    }
}

export class LarkbaseAuthenticator {
    private config: {
        app_id: string;
        app_secret: string;
        api_endpoint: string;
    };

    constructor() {
        this.config = {
            app_id: process.env.LARK_APP_ID || 'cli_a7fab27260385010',
            app_secret: process.env.LARK_APP_SECRET || 'Zg4MVcFfiOu0g09voTcpfd4WGDpA0Ly5',
            api_endpoint: 'https://open.larksuite.com/open-apis'
        };
    }

    async authenticate(): Promise<string | null> {
        try {
            console.log(`[DEBUG] Starting authentication...`);
            console.log(`[DEBUG] App ID: ${this.config.app_id}`);
            console.log(`[DEBUG] App Secret: ${this.config.app_secret.substring(0, 10)}...`);
            
            const url = `${this.config.api_endpoint}/auth/v3/tenant_access_token/internal`;
            console.log(`[DEBUG] Auth URL: ${url}`);
            
            const requestBody = {
                app_id: this.config.app_id,
                app_secret: this.config.app_secret
            };
            console.log(`[DEBUG] Request body: ${JSON.stringify(requestBody)}`);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'User-Agent': 'document-approval-processor/1.0'
                },
                body: JSON.stringify(requestBody)
            });

            console.log(`[DEBUG] Response status: ${response.status}`);
            console.log(`[DEBUG] Response headers: ${JSON.stringify(Object.fromEntries(response.headers))}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[ERROR] HTTP error: ${response.status} - ${errorText}`);
                return null;
            }

            const responseText = await response.text();
            console.log(`[DEBUG] Raw response: ${responseText}`);
            
            let data: any;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error(`[ERROR] JSON parse error: ${parseError}`);
                console.error(`[ERROR] Response text: ${responseText}`);
                return null;
            }
            
            console.log(`[DEBUG] Parsed response: ${JSON.stringify(data)}`);
            console.log(`[DEBUG] Response code: ${data.code}`);
            
            if (data.code === 0 && data.tenant_access_token) {
                const token = data.tenant_access_token;
                console.log(`[SUCCESS] Authentication successful! Token: ${token.substring(0, 20)}...`);
                return token;
            } else {
                console.error(`[ERROR] API error: Code=${data.code}, Message=${data.msg || data.message || 'Unknown'}`);
                return null;
            }
        } catch (error: any) {
            console.error(`[ERROR] Authentication exception: ${error.message}`);
            console.error(`[ERROR] Stack trace: ${error.stack}`);
            return null;
        }
    }
}

