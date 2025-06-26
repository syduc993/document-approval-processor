import { APPROVAL_CONFIG } from '../utils/helpers';
import { LarkApiResponse } from '../types';

export class ApprovalService {
    private tenantAccessToken: string;

    constructor(tenantAccessToken: string) {
        this.tenantAccessToken = tenantAccessToken;
    }

    async createApprovalInstance(
        id: string,
        loaiVanBan: string,
        uploadedCodes: string[],
        creatorOpenId: string
    ): Promise<string> {
        // Validation đầu vào

        if (!id || id.trim() === '') {
            throw new Error('ID không được để trống');
        }

        if (!loaiVanBan || loaiVanBan.trim() === '') {
            throw new Error('Loại văn bản không được để trống');
        }

        if (!creatorOpenId || creatorOpenId.trim() === '') {
            throw new Error('Creator Open ID không được để trống');
        }

        console.log(`[DEBUG] Creating approval instance:`);
        console.log(`[DEBUG] - Template code: ${APPROVAL_CONFIG.TEMPLATE_CODE}`);
        console.log(`[DEBUG] - Loại văn bản: "${loaiVanBan}"`);
        console.log(`[DEBUG] - Creator Open ID: ${creatorOpenId}`);
        console.log(`[DEBUG] - Upload codes: ${JSON.stringify(uploadedCodes)}`);
        console.log(`[DEBUG] - Widget IDs: ${JSON.stringify(APPROVAL_CONFIG.WIDGET_IDS)}`);

        const formWidgets = [
            {
                id: APPROVAL_CONFIG.WIDGET_IDS.id, // Thêm widget cho ID
                type: "input",
                value: id.toString()
            },

            {
                id: APPROVAL_CONFIG.WIDGET_IDS.loaiVanBan,
                //type: "radioV2",
                type: "input",
                value: loaiVanBan.toString() // Đảm bảo là string
            },
            {
                id: APPROVAL_CONFIG.WIDGET_IDS.hoSoDinhKem,
                type: "attachmentV2",
                value: uploadedCodes
            }
        ];

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
