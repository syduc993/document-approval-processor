import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { LarkService } from './services/larkService';
import { ApprovalService } from './services/approvalService';
import { LarkbaseAuthenticator, APPROVAL_CONFIG } from './utils/helpers';
import { DocumentRequest, ProcessResult } from './types';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Thêm endpoint để debug approval definition
app.get('/debug-approval/:approvalCode', async (req, res) => {
    try {
        const { approvalCode } = req.params;
        
        const authenticator = new LarkbaseAuthenticator();
        const tenantAccessToken = await authenticator.authenticate();
        
        if (!tenantAccessToken) {
            throw new Error('Không thể lấy access token');
        }

        const larkService = new LarkService(tenantAccessToken);
        const definition = await larkService.getApprovalDefinition(approvalCode);
        
        res.json({
            success: true,
            data: definition
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.post('/process-document', async (req, res) => {
    try {
        const {
            recordId,
            appToken,
            tableID,
            idFieldName,
            vanBanCap1FieldName,
            vanBanCap2FieldName,
            vanBanCap3FieldName,
            ngayThangNamVanBanFieldName,
            phapNhanAtinoFieldName,
            congTyDoiTacFieldName,
            mucDoUuTienFieldName,
            ghiChuFieldName,
            giaTriHopDongFieldName,
            giaTriThueMatBangFieldName,
            taiLieuDinhKemFieldName,
            creatorOpenId
        }: DocumentRequest = req.body;

        console.log('=== BẮT ĐẦU XỬ LÝ VĂN BẢN ===');

        // Bước 1: Lấy access token
        const authenticator = new LarkbaseAuthenticator();
        const tenantAccessToken = await authenticator.authenticate();
        
        if (!tenantAccessToken) {
            throw new Error('Không thể lấy access token');
        }

        // Bước 2: Khởi tạo services
        const larkService = new LarkService(tenantAccessToken);
        const approvalService = new ApprovalService(tenantAccessToken);

        // Bước 3: Lấy dữ liệu từ Larkbase
        const fields = await larkService.getRecord(appToken, tableID, recordId);
        const fieldID = await larkService.getFieldId(appToken, tableID, taiLieuDinhKemFieldName);

        // Xử lý ID
        const rawId = fields[idFieldName] || '';
        let id = '';
        if (Array.isArray(rawId) && rawId.length > 0 && rawId[0].text) {
            id = rawId[0].text.toString();
        } else if (typeof rawId === 'string') {
            id = rawId;
        } else {
            id = rawId.toString();
        }

        // Hàm helper để xử lý field value
        const getFieldValue = (fieldName: string) => {
            const rawValue = fields[fieldName];
            if (Array.isArray(rawValue) && rawValue.length > 0 && rawValue[0].text) {
                return rawValue[0].text.toString();
            } else if (typeof rawValue === 'string') {
                return rawValue;
            } else if (rawValue !== undefined && rawValue !== null) {
                return rawValue.toString();
            }
            return '';
        };

        // Lấy tất cả các giá trị field
        const formData = {
            id: id.toString(),
            vanBanCap1: getFieldValue(vanBanCap1FieldName),
            vanBanCap2: vanBanCap2FieldName ? getFieldValue(vanBanCap2FieldName) : undefined,
            vanBanCap3: vanBanCap3FieldName ? getFieldValue(vanBanCap3FieldName) : undefined,
            ngayThangNamVanBan: ngayThangNamVanBanFieldName ? getFieldValue(ngayThangNamVanBanFieldName) : undefined,
            phapNhanAtino: phapNhanAtinoFieldName ? getFieldValue(phapNhanAtinoFieldName) : undefined,
            congTyDoiTac: congTyDoiTacFieldName ? getFieldValue(congTyDoiTacFieldName) : undefined,
            mucDoUuTien: mucDoUuTienFieldName ? getFieldValue(mucDoUuTienFieldName) : undefined,
            ghiChu: ghiChuFieldName ? getFieldValue(ghiChuFieldName) : undefined,
            giaTriHopDong: giaTriHopDongFieldName ? parseFloat(getFieldValue(giaTriHopDongFieldName)) || undefined : undefined,
            giaTriThueMatBang: giaTriThueMatBangFieldName ? parseFloat(getFieldValue(giaTriThueMatBangFieldName)) || undefined : undefined
        };


        console.log(`[DATA] Form data:`, formData);

        // Validation
        if (!formData.vanBanCap1 || formData.vanBanCap1.trim() === '') {
            throw new Error(`Trường "${vanBanCap1FieldName}" không có giá trị hoặc rỗng`);
        }

        // Bước 4: Xử lý tài liệu
        console.log('[3] Đang xử lý tài liệu...');
        const uploadedCodes = await larkService.processDocuments(
            fields,
            taiLieuDinhKemFieldName,
            fieldID,
            recordId,
            tableID
        );

        // Bước 5: Tạo approval instance
        console.log('[4] Đang tạo approval instance...');
        const instanceCode = await approvalService.createApprovalInstance(
            formData,
            uploadedCodes,
            creatorOpenId
        );

        console.log('=== HOÀN THÀNH XỬ LÝ VĂN BẢN ===');

        const response: ProcessResult = {
            success: true,
            instanceCode,
            message: `Đã tạo thành công đơn phê duyệt văn bản với ${uploadedCodes.length} tài liệu đính kèm`,
            documentInfo: { 
                vanBanCap1: formData.vanBanCap1,
                vanBanCap2: formData.vanBanCap2,
                vanBanCap3: formData.vanBanCap3,
                phapNhanAtino: formData.phapNhanAtino,
                congTyDoiTac: formData.congTyDoiTac,
                mucDoUuTien: formData.mucDoUuTien,
                ghiChu: formData.ghiChu,
                giaTriHopDong: formData.giaTriHopDong,
                giaTriThueMatBang: formData.giaTriThueMatBang,
                ngayThangNamVanBan: formData.ngayThangNamVanBan
            },
            uploadedCodes,
            documentCount: uploadedCodes.length
        };


        res.json(response);

    } catch (error: any) {
        console.error('❌ Lỗi xử lý:', error.message);
        
        const errorResponse: ProcessResult = {
            success: false,
            message: `Lỗi: ${error.message}`,
            uploadedCodes: [],
            documentCount: 0,
            errorDetails: error.message
        };

        res.status(500).json(errorResponse);
    }
});


app.listen(port, () => {
    console.log(`🚀 Server đang chạy tại port ${port}`);
    console.log(`📋 Health check: http://localhost:${port}/health`);
    console.log(`📄 Process document: http://localhost:${port}/process-document`);
    console.log(`🔍 Debug approval: http://localhost:${port}/debug-approval/${APPROVAL_CONFIG.TEMPLATE_CODE}`);
});
