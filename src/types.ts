export interface DocumentRequest {
    recordId: string;
    appToken: string;
    tableID: string;
    idFieldName: string;
    loaiVanBanFieldName: string;
    hoSoDinhKemFieldName: string;
    creatorOpenId: string;
}

export interface ProcessResult {
    success: boolean;
    instanceCode?: string;
    message: string;
    documentInfo?: {
        loaiVanBan: string;
    };
    uploadedCodes: string[];
    documentCount: number;
    errorDetails?: string;
}

export interface LarkbaseConfig {
    app_id: string;
    app_secret: string;
    api_endpoint: string;
}

export interface DocumentItem {
    file_token: string;
    name: string;
}

// Thêm các interface cho API response
export interface LarkApiResponse<T = any> {
    code: number;
    msg?: string;
    message?: string;
    data?: T;
}

export interface LarkRecordResponse {
    record: {
        fields: Record<string, any>;
    };
}

export interface LarkFieldResponse {
    items: Array<{
        field_id: string;
        field_name: string;
        type: number;
    }>;
}

export interface ApprovalUploadResponse {
    code: string;
}
