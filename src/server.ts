import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { LarkService } from './services/larkService';
import { ApprovalService } from './services/approvalService';
import { LarkbaseAuthenticator } from './utils/helpers';
import { DocumentRequest, ProcessResult } from './types';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/process-document', async (req, res) => {
    try {
        const {
            recordId,
            appToken,
            tableID,
            loaiVanBanFieldName,
            hoSoDinhKemFieldName,
            creatorOpenId
        }: DocumentRequest = req.body;

        console.log('=== BẮT ĐẦU XỬ LÝ VĂN BẢN ===');

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

        // Bước 3: Lấy dữ liệu từ Larkbase
        console.log('[2] Đang lấy dữ liệu từ Larkbase...');
        const fields = await larkService.getRecord(appToken, tableID, recordId);
        const fieldID = await larkService.getFieldId(appToken, tableID, hoSoDinhKemFieldName);
        const loaiVanBan = fields[loaiVanBanFieldName] || '';
        console.log(`✓ Lấy dữ liệu thành công - Loại văn bản: ${loaiVanBan}`);

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
            loaiVanBan,
            uploadedCodes,
            creatorOpenId
        );
        console.log(`✓ Tạo approval thành công: ${instanceCode}`);

        console.log('=== HOÀN THÀNH XỬ LÝ VĂN BẢN ===');

        const response: ProcessResult = {
            success: true,
            instanceCode,
            message: `Đã tạo thành công đơn phê duyệt văn bản với ${uploadedCodes.length} tài liệu đính kèm`,
            documentInfo: { loaiVanBan },
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
});
