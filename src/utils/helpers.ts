import { LarkApiResponse } from '../types';

export const APPROVAL_CONFIG = {
    TEMPLATE_CODE: "YOUR_TEMPLATE_CODE_HERE",
    WIDGET_IDS: {
        loaiVanBan: "widget_loai_van_ban_id",
        hoSoDinhKem: "widget_ho_so_dinh_kem_id"
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
        chunks.push(Buffer.from(`Content-Disposition: form-data; name="type"${CRLF}${CRLF}document${CRLF}`));
        
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
            const url = `${this.config.api_endpoint}/auth/v3/tenant_access_token/internal`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app_id: this.config.app_id,
                    app_secret: this.config.app_secret
                })
            });

            const data = await response.json() as LarkApiResponse<{ tenant_access_token: string }>;
            
            if (data.code === 0 && data.data?.tenant_access_token) {
                return data.data.tenant_access_token;
            } else {
                console.error(`Lỗi API: ${data.msg || data.message || 'Không xác định'}`);
                return null;
            }
        } catch (error: any) {
            console.error(`Lỗi xác thực: ${error.message}`);
            return null;
        }
    }
}
