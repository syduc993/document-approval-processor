import { APPROVAL_CONFIG } from '../utils/helpers';
import { LarkApiResponse } from '../types';

export class ApprovalService {
    private tenantAccessToken: string;

    constructor(tenantAccessToken: string) {
        this.tenantAccessToken = tenantAccessToken;
    }

    async createApprovalInstance(
        loaiVanBan: string,
        uploadedCodes: string[],
        creatorOpenId: string
    ): Promise<string> {
        const formWidgets = [
            {
                id: APPROVAL_CONFIG.WIDGET_IDS.loaiVanBan,
                type: "select",
                value: loaiVanBan
            },
            {
                id: APPROVAL_CONFIG.WIDGET_IDS.hoSoDinhKem,
                type: "attachment",
                value: uploadedCodes
            }
        ];

        const response = await fetch('https://open.larksuite.com/open-apis/approval/v4/instances', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.tenantAccessToken}`
            },
            body: JSON.stringify({
                approval_code: APPROVAL_CONFIG.TEMPLATE_CODE,
                form: JSON.stringify(formWidgets),
                open_id: creatorOpenId
            })
        });

        const result = await response.json() as LarkApiResponse<{ instance_code: string }>;
        if (result.code !== 0) throw new Error(`Lỗi tạo approval: ${result.msg || result.message}`);
        
        if (!result.data?.instance_code) {
            throw new Error('Không nhận được instance code từ server');
        }
        
        return result.data.instance_code;
    }
}
