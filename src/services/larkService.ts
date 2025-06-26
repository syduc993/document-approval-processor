import { DocumentItem, LarkApiResponse, LarkRecordResponse, LarkFieldResponse, ApprovalUploadResponse } from '../types';
import { FileHelper } from '../utils/helpers';

export class LarkService {
    private tenantAccessToken: string;

    constructor(tenantAccessToken: string) {
        this.tenantAccessToken = tenantAccessToken;
    }

    async getRecord(appToken: string, tableID: string, recordId: string): Promise<any> {
        const url = `https://open.larksuite.com/open-apis/bitable/v1/apps/${appToken}/tables/${tableID}/records/${recordId}`;
        
        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${this.tenantAccessToken}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json() as LarkApiResponse<LarkRecordResponse>;
        if (data.code !== 0) throw new Error(`Lỗi lấy record: ${data.msg || data.message}`);
        
        if (!data.data?.record?.fields) {
            throw new Error('Không tìm thấy dữ liệu record');
        }
        
        return data.data.record.fields;
    }

    async getFieldId(appToken: string, tableID: string, fieldName: string): Promise<string> {
        const url = `https://open.larksuite.com/open-apis/bitable/v1/apps/${appToken}/tables/${tableID}/fields`;
        
        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${this.tenantAccessToken}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json() as LarkApiResponse<LarkFieldResponse>;
        if (data.code !== 0) throw new Error(`Lỗi lấy fields: ${data.msg || data.message}`);
        
        if (!data.data?.items) {
            throw new Error('Không tìm thấy dữ liệu fields');
        }
        
        const field = data.data.items.find((item) => item.field_name === fieldName);
        if (!field) throw new Error(`Không tìm thấy field "${fieldName}"`);
        
        return field.field_id;
    }

    async downloadDocument(fileToken: string, extra: string): Promise<Buffer> {
        const url = `https://open.larksuite.com/open-apis/drive/v1/medias/${fileToken}/download?extra=${extra}`;
        
        const response = await fetch(url, {
            headers: { "Authorization": `Bearer ${this.tenantAccessToken}` }
        });

        if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
        return Buffer.from(await response.arrayBuffer());
    }

    async processDocuments(
        fields: any,
        documentFieldName: string,
        fieldID: string,
        recordID: string,
        tableID: string
    ): Promise<string[]> {
        const uploadedCodes: string[] = [];
        
        if (!fields[documentFieldName] || !Array.isArray(fields[documentFieldName])) {
            console.log(`Không tìm thấy field "${documentFieldName}"`);
            return uploadedCodes;
        }

        const documentList: DocumentItem[] = fields[documentFieldName];
        console.log(`Tìm thấy ${documentList.length} tài liệu cần xử lý`);

        for (let i = 0; i < documentList.length; i++) {
            const doc = documentList[i];
            const fileName = doc.name || `document_${i + 1}.pdf`;
            
            if (!FileHelper.isValidDocumentType(fileName)) {
                console.error(`${fileName}: Định dạng không hỗ trợ`);
                continue;
            }
            
            try {
                console.log(`Xử lý tài liệu ${i + 1}/${documentList.length}: ${fileName}`);
                
                const extra = FileHelper.buildExtra(fieldID, doc.file_token, recordID, tableID);
                const documentBuffer = await this.downloadDocument(doc.file_token, extra);
                const uploadCode = await this.uploadDocument(fileName, documentBuffer);
                
                uploadedCodes.push(uploadCode);
                console.log(`✓ Xử lý thành công: ${fileName}`);
                
            } catch (error: any) {
                console.error(`✗ Lỗi xử lý ${fileName}: ${error.message}`);
            }
        }

        return uploadedCodes;
    }

    private async uploadDocument(fileName: string, documentBuffer: Buffer): Promise<string> {
        const { body, boundary } = FileHelper.createMultipartBody(fileName, documentBuffer);
        
        const response = await fetch('https://www.larksuite.com/approval/openapi/v2/file/upload', {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${this.tenantAccessToken}`,
                "Content-Type": `multipart/form-data; boundary=${boundary}`
            },
            body: body
        });

        const result = await response.json() as LarkApiResponse<ApprovalUploadResponse>;
        if (result.code !== 0) throw new Error(`Upload thất bại: ${result.msg || result.message}`);
        
        if (!result.data?.code) {
            throw new Error('Không nhận được upload code từ server');
        }
        
        return result.data.code;
    }
}
