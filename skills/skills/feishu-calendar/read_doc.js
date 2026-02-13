const axios = require('axios');

const USER_TOKEN = 'u-c_Flqz4rV4nEYUSqrqjmp25lgZiQk1WpMOaa7xU02cE5';
const DOC_TOKEN = 'KlREdb64FouxTaxkFCfcQRBgnod';

async function readDoc() {
    try {
        console.log('读取文档内容...\n');
        
        // 获取文档内容
        const res = await axios.get(`https://open.feishu.cn/open-apis/docx/v1/documents/${DOC_TOKEN}/content`, {
            headers: {
                'Authorization': `Bearer ${USER_TOKEN}`
            }
        });
        
        console.log('文档内容:');
        console.log(JSON.stringify(res.data, null, 2));
        
    } catch (error) {
        console.error('读取失败:', error.message);
        if (error.response) {
            console.error('错误:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

readDoc();
