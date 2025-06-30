async function main(params) {
    try {
        // Thông tin xác thực
        const app_id = "cli_a7fab27260385010";
        const app_secret = "Zg4MVcFfiOu0g09voTcpfd4WGDpA0Ly5";
        const document_id = "WIWod0yKTojPZCxBdhglf9Jug4e";
        const lang = 0;
        console.log("DEBUG:")
        // Bước 1: Lấy tenant access token
        const tenantAccessTokenResponse = await fetch('https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                app_id: app_id,
                app_secret: app_secret
            })
        });

        // Kiểm tra response status
        if (!tenantAccessTokenResponse.ok) {
            throw new Error(`HTTP error! status: ${tenantAccessTokenResponse.status}`);
        }

        const tenantAccessTokenData = await tenantAccessTokenResponse.json();
        
        // Kiểm tra response code từ API
        if (tenantAccessTokenData.code !== 0) {
            throw new Error(`API error: ${tenantAccessTokenData.msg || 'Unknown error'}`);
        }

        const tenant_access_token = tenantAccessTokenData.tenant_access_token;
        
        // Kiểm tra xem token có tồn tại không
        if (!tenant_access_token) {
            throw new Error('No access token received from authentication');
        }

        console.log('Access token obtained successfully');

        // Bước 2: Lấy raw content của document
        const documentResponse = await fetch(`https://open.larksuite.com/open-apis/docx/v1/documents/${document_id}/raw_content?lang=${lang}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tenant_access_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!documentResponse.ok) {
            throw new Error(`Document API error! status: ${documentResponse.status}`);
        }

        const documentData = await documentResponse.json();
        
        // Kiểm tra response từ document API
        if (documentData.code !== 0) {
            throw new Error(`Document API error: ${documentData.msg || 'Unknown error'}`);
        }
        
        return documentData;
        
    } catch (error) {
        console.error('Error details:', error);
        throw new Error(`An error occurred: ${error.message}`);
    }
}
