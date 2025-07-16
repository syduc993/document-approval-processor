import { APPROVAL_CONFIG } from '../utils/helpers';
import { LarkApiResponse } from '../types';

export class ApprovalService {
    private tenantAccessToken: string;

    constructor(tenantAccessToken: string) {
        this.tenantAccessToken = tenantAccessToken;
    }

    async createApprovalInstance(
        formData: {
            id: string;
            vanBanCap1: string;
            vanBanCap2?: string;
            vanBanCap3?: string;
            ngayThangNamVanBan?: string;
            phapNhanAtino?: string;
            congTyDoiTac?: string;
            mucDoUuTien?: string;
            ghiChu?: string;
            giaTriHopDong?: number;
            giaTriThueMatBang?: number;
        },
        uploadedCodes: string[],
        rawCreatorOpenId: any
    ): Promise<string> {
        // Validation đầu vào
        if (!formData.id || formData.id.trim() === '') {
            throw new Error('ID không được để trống');
        }

        if (!formData.vanBanCap1 || formData.vanBanCap1.trim() === '') {
            throw new Error('Văn bản cấp 1 không được để trống');
        }

        let creatorOpenId = '';
        if (Array.isArray(rawCreatorOpenId) && rawCreatorOpenId.length > 0 && rawCreatorOpenId[0].text) {
            creatorOpenId = rawCreatorOpenId[0].text.toString();
        } else if (typeof rawCreatorOpenId === 'string') {
            creatorOpenId = rawCreatorOpenId;
        } else if (rawCreatorOpenId) {
            creatorOpenId = rawCreatorOpenId.toString();
        }

        if (!creatorOpenId || creatorOpenId.trim() === '') {
            throw new Error('Creator Open ID không được để trống');
        }

        console.log(`[DEBUG] Creating approval instance with form data:`, formData);

        // Tạo form widgets với type union để hỗ trợ cả string và string[]
        const formWidgets: Array<{
            id: string;
            type: string;
            value: string | string[];
        }> = [
            {
                id: APPROVAL_CONFIG.WIDGET_IDS.id,
                type: "input",
                value: formData.id.toString()
            },
            {
                id: APPROVAL_CONFIG.WIDGET_IDS.vanBanCap1,
                type: "input",
                value: formData.vanBanCap1.toString()
            }
        ];

        // Thêm các trường optional
        if (formData.vanBanCap2) {
            formWidgets.push({
                id: APPROVAL_CONFIG.WIDGET_IDS.vanBanCap2,
                type: "input",
                value: formData.vanBanCap2.toString()
            });
        }

        if (formData.vanBanCap3) {
            formWidgets.push({
                id: APPROVAL_CONFIG.WIDGET_IDS.vanBanCap3,
                type: "input",
                value: formData.vanBanCap3.toString()
            });
        }

        if (formData.ngayThangNamVanBan) {
            formWidgets.push({
                id: APPROVAL_CONFIG.WIDGET_IDS.ngayThangNamVanBan,
                type: "date",
                value: formData.ngayThangNamVanBan
            });
        }

        if (formData.phapNhanAtino) {
            formWidgets.push({
                id: APPROVAL_CONFIG.WIDGET_IDS.phapNhanAtino,
                type: "input",
                value: formData.phapNhanAtino.toString()
            });
        }

        if (formData.congTyDoiTac) {
            formWidgets.push({
                id: APPROVAL_CONFIG.WIDGET_IDS.congTyDoiTac,
                type: "input",
                value: formData.congTyDoiTac.toString()
            });
        }

        if (formData.mucDoUuTien) {
            formWidgets.push({
                id: APPROVAL_CONFIG.WIDGET_IDS.mucDoUuTien,
                type: "input",
                value: formData.mucDoUuTien.toString()
            });
        }

        if (formData.ghiChu) {
            formWidgets.push({
                id: APPROVAL_CONFIG.WIDGET_IDS.ghiChu,
                type: "input",
                value: formData.ghiChu.toString()
            });
        }

        if (formData.giaTriHopDong !== undefined) {
            formWidgets.push({
                id: APPROVAL_CONFIG.WIDGET_IDS.giaTriHopDong,
                type: "amount",
                value: formData.giaTriHopDong.toString()
            });
        }

        if (formData.giaTriThueMatBang !== undefined) {
            formWidgets.push({
                id: APPROVAL_CONFIG.WIDGET_IDS.giaTriThueMatBang,
                type: "amount",
                value: formData.giaTriThueMatBang.toString()
            });
        }

        // Thêm tài liệu đính kèm - ĐÂY LÀ PHẦN QUAN TRỌNG
        formWidgets.push({
            id: APPROVAL_CONFIG.WIDGET_IDS.taiLieuDinhKem,
            type: "attachmentV2",
            value: uploadedCodes // Đây là array cho attachmentV2
        });

        console.log(`[DEBUG] Form widgets:`, JSON.stringify(formWidgets, null, 2));

        const requestBody = {
            approval_code: APPROVAL_CONFIG.TEMPLATE_CODE,
            form: JSON.stringify(formWidgets),
            open_id: creatorOpenId
        };

        console.log(`[DEBUG] Request body:`, JSON.stringify(requestBody, null, 2));

        const response = await fetch('https://open.larksuite.com/open-apis/approval/v4/instances', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.tenantAccessToken}`
            },
            body: JSON.stringify(requestBody)
        });

        console.log(`[DEBUG] Response status: ${response.status}`);
        
        const responseText = await response.text();
        console.log(`[DEBUG] Response text: ${responseText}`);

        let result: LarkApiResponse<{ instance_code: string }>;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            throw new Error(`Lỗi parse response: ${parseError}`);
        }

        console.log(`[DEBUG] Parsed response:`, JSON.stringify(result, null, 2));

        if (result.code !== 0) {
            throw new Error(`Lỗi tạo approval: ${result.msg || result.message}`);
        }
        
        if (!result.data?.instance_code) {
            throw new Error('Không nhận được instance code từ server');
        }
        
        console.log(`[SUCCESS] Approval instance created: ${result.data.instance_code}`);
        return result.data.instance_code;
    }
}
