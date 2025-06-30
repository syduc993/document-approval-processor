export interface DocumentRequest {
    recordId: string;
    appToken: string;
    tableID: string;
    idFieldName: string;
    vanBanCap1FieldName: string;
    vanBanCap2FieldName?: string;
    vanBanCap3FieldName?: string;
    ngayThangNamVanBanFieldName?: string;
    phapNhanAtinoFieldName?: string;
    congTyDoiTacFieldName?: string;
    mucDoUuTienFieldName?: string;
    ghiChuFieldName?: string;
    giaTriHopDongFieldName?: string;
    giaTriThueMatBangFieldName?: string;
    taiLieuDinhKemFieldName: string;
    creatorOpenId: any;
}


export interface ProcessResult {
    success: boolean;
    instanceCode?: string;
    message: string;
    documentInfo?: {
        vanBanCap1: string;
        vanBanCap2?: string;
        vanBanCap3?: string;
        phapNhanAtino?: string;
        congTyDoiTac?: string;
        mucDoUuTien?: string;
        ghiChu?: string;
        giaTriHopDong?: number;
        giaTriThueMatBang?: number;
        ngayThangNamVanBan?: string;
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
