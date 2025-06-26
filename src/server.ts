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
            loaiVanBanFieldName,
            hoSoDinhKemFieldName,
            creatorOpenId
        }: DocumentRequest = req.body;

        console.log('=== BẮT ĐẦU XỬ LÝ VĂN BẢN ===');
        console.log(`[INPUT] Record ID: ${recordId}`);
        console.log(`[INPUT] App Token: ${appToken}`);
        console.log(`[INPUT] Table ID: ${tableID}`);
        console.log(`[INPUT] Loại văn bản field: ${loaiVanBanFieldName}`);
        console.log(`[INPUT] Hồ sơ đính kèm field: ${hoSoDinhKemFieldName}`);
        console.log(`[INPUT] Creator Open ID: ${creatorOpenId}`);

        // Bước 1: Lấy access token tự động
        console.log('[1] Đang xác thực và lấy access token...');
        const authenticator = new LarkbaseAuthenticator();
        const tenantAccessToken = await authenticator.authenticate();
        
        if (!tenantAccessToken) {
            throw new Error('Không thể lấy access token');
        }
        console.log('✓ Lấy access token thành công');

        // Bước 2: Khởi tạo services
        const larkService = new LarkService(tenantAccessToken);
        const approvalService = new ApprovalService(tenantAccessToken);

        // Debug: Lấy approval definition để kiểm tra widget IDs
        console.log('[DEBUG] Đang lấy approval definition...');
        try {
            const definition = await larkService.getApprovalDefinition(APPROVAL_CONFIG.TEMPLATE_CODE);
            console.log('[DEBUG] Approval definition lấy thành công');
        } catch (debugError: any) {
            console.warn(`[WARNING] Không thể lấy approval definition: ${debugError.message}`);
        }

        // Bước 3: Lấy dữ liệu từ Larkbase
        console.log('[2] Đang lấy dữ liệu từ Larkbase...');
        
        const fields = await larkService.getRecord(appToken, tableID, recordId);
        const fieldID = await larkService.getFieldId(appToken, tableID, hoSoDinhKemFieldName);
        const loaiVanBan = fields[loaiVanBanFieldName] || '';
        //const id = fields[idFieldName] || ''; // Lấy giá trị ID
        const rawId = fields[idFieldName] || '';
        let id = '';

        // Xử lý ID field có cấu trúc [{"text": "recv6dq3ft", "type": "text"}]
        if (Array.isArray(rawId) && rawId.length > 0 && rawId[0].text) {
            id = rawId[0].text.toString();
        } else if (typeof rawId === 'string') {
            id = rawId;
        } else {
            id = rawId.toString();
        }

        console.log(`[DEBUG] Raw ID:`, JSON.stringify(rawId, null, 2));
        console.log(`[DEBUG] Extracted ID: "${id}"`);

        
        // DEBUG: In ra cấu trúc chi tiết của ID
        console.log(`[DEBUG] Raw ID value:`, JSON.stringify(id, null, 2));
        console.log(`[DEBUG] ID type:`, typeof id);
        console.log(`[DEBUG] ID constructor:`, id.constructor?.name);

        // DEBUG: In ra toàn bộ fields để xem cấu trúc
        console.log(`[DEBUG] All fields structure:`, JSON.stringify(fields, null, 2));


        console.log(`✓ Lấy dữ liệu thành công`);
        console.log(`[DATA] Loại văn bản: "${loaiVanBan}"`);
        console.log(`[DATA] Field ID: ${fieldID}`);
        console.log(`[DATA] All fields:`, JSON.stringify(fields, null, 2));



        // Validation loại văn bản
        if (!loaiVanBan || loaiVanBan.toString().trim() === '') {
            throw new Error(`Trường "${loaiVanBanFieldName}" không có giá trị hoặc rỗng`);
        }

        // Bước 4: Xử lý tài liệu
        console.log('[3] Đang xử lý tài liệu...');
        const uploadedCodes = await larkService.processDocuments(
            fields,
            hoSoDinhKemFieldName,
            fieldID,
            recordId,
            tableID
        );
        console.log(`✓ Xử lý ${uploadedCodes.length} tài liệu thành công`);

        // Bước 5: Tạo approval instance
        console.log('[4] Đang tạo approval instance...');
        const instanceCode = await approvalService.createApprovalInstance(
            id.toString(),
            loaiVanBan.toString(),
            uploadedCodes,
            creatorOpenId
        );
        console.log(`✓ Tạo approval thành công: ${instanceCode}`);

        console.log('=== HOÀN THÀNH XỬ LÝ VĂN BẢN ===');

        const response: ProcessResult = {
            success: true,
            instanceCode,
            message: `Đã tạo thành công đơn phê duyệt văn bản với ${uploadedCodes.length} tài liệu đính kèm`,
            documentInfo: { loaiVanBan: loaiVanBan.toString() },
            uploadedCodes,
            documentCount: uploadedCodes.length
        };

        res.json(response);

    } catch (error: any) {
        console.error('❌ Lỗi xử lý:', error.message);
        console.error('❌ Stack trace:', error.stack);
        
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
